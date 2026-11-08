package org.metaschool.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import java.util.Calendar

/**
 * Планировщик системных будильников и фоновых таймеров Android.
 * Обеспечивает точный расчёт следующего срабатывания, поддержку повторения по дням,
 * корректный переход через полночь, отмену и восстановление расписания.
 */
object AlarmScheduler {
    private const val TAG = "AlarmScheduler"
    const val ACTION_ALARM_TRIGGER = "org.metaschool.app.ALARM_TRIGGER"
    const val ACTION_TIMER_TRIGGER = "org.metaschool.app.TIMER_TRIGGER"
    private const val TIMER_REQUEST_CODE = 999999

    /**
     * Проверка доступности точных будильников на Android 12+ (API 31+).
     * Не полагается исключительно на наличие SCHEDULE_EXACT_ALARM в манифесте.
     */
    fun canScheduleExact(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            am?.canScheduleExactAlarms() ?: false
        } else {
            true
        }
    }

    /**
     * Вычисляет точное время следующего срабатывания (в миллисекундах от эпохи).
     * @param time Время в формате "HH:mm"
     * @param days Дни повторения: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб
     */
    fun computeNextTriggerMillis(time: String, days: List<Int>): Long {
        val parts = time.split(":").map { it.trim().toIntOrNull() ?: 0 }
        val targetHour = parts.getOrElse(0) { 7 }
        val targetMin = parts.getOrElse(1) { 30 }

        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, targetHour)
            set(Calendar.MINUTE, targetMin)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // Если дни не указаны — однократный будильник на сегодня или завтра
        if (days.isEmpty()) {
            if (target.timeInMillis <= now.timeInMillis) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }
            return target.timeInMillis
        }

        // Повторяющийся будильник по дням недели
        // Calendar.SUNDAY = 1, MONDAY = 2, ... SATURDAY = 7
        fun calToDayIdx(cal: Calendar): Int {
            return if (cal.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY) 0 else cal.get(Calendar.DAY_OF_WEEK) - 1
        }

        val todayIdx = calToDayIdx(now)

        // 1. Проверяем сегодня: если сегодня входит в список и время ещё не наступило
        if (days.contains(todayIdx) && target.timeInMillis > now.timeInMillis) {
            return target.timeInMillis
        }

        // 2. Ищем ближайший следующий подходящий день (от +1 до +7 дней)
        for (offset in 1..7) {
            val candidate = (now.clone() as Calendar).apply {
                add(Calendar.DAY_OF_YEAR, offset)
                set(Calendar.HOUR_OF_DAY, targetHour)
                set(Calendar.MINUTE, targetMin)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val candidateDayIdx = calToDayIdx(candidate)
            if (days.contains(candidateDayIdx)) {
                return candidate.timeInMillis
            }
        }

        // Запасной fallback на 24 часа вперед
        return now.timeInMillis + 86400000L
    }

    /**
     * Планирование будильника в AlarmManager и сохранение в постоянное хранилище AlarmStore.
     */
    fun scheduleAlarm(context: Context, alarm: AlarmModel): Boolean {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return false

        // Отменяем предыдущий PendingIntent перед перепланированием
        cancelAlarmIntent(context, alarm.id)

        if (!alarm.enabled) {
            AlarmStore.saveAlarm(context, alarm)
            return true
        }

        val triggerAtMillis = computeNextTriggerMillis(alarm.time, alarm.days)

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_ALARM_TRIGGER
            putExtra("alarmId", alarm.id)
            putExtra("label", alarm.label)
            putExtra("sound", alarm.sound)
            putExtra("time", alarm.time)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarm.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (canScheduleExact(context)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } else {
                // Если точный будильник запрещён политикой ОС, используем доступный режим
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            }

            AlarmStore.saveAlarm(context, alarm)
            Log.d(TAG, "Будильник ${alarm.id} запланирован на $triggerAtMillis")
            return true
        } catch (e: SecurityException) {
            Log.e(TAG, "Ошибка безопасности при установке будильника: ${e.message}")
            AlarmStore.saveAlarm(context, alarm)
            return false
        }
    }

    /**
     * Отмена будильника в AlarmManager и удаление из постоянного хранилища.
     */
    fun cancelAlarm(context: Context, alarmId: String) {
        cancelAlarmIntent(context, alarmId)
        AlarmStore.removeAlarm(context, alarmId)
        Log.d(TAG, "Будильник $alarmId отменён и удалён")
    }

    private fun cancelAlarmIntent(context: Context, alarmId: String) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_ALARM_TRIGGER
            putExtra("alarmId", alarmId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.cancel(pendingIntent)
        pendingIntent.cancel()
    }

    /**
     * Планирование системного таймера (срабатывает даже при закрытом WebView).
     */
    fun scheduleTimer(context: Context, durationSeconds: Int, label: String): Boolean {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return false
        cancelTimer(context)

        if (durationSeconds <= 0) return false

        val triggerAtMillis = System.currentTimeMillis() + (durationSeconds * 1000L)

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_TIMER_TRIGGER
            putExtra("label", label)
            putExtra("durationSeconds", durationSeconds)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            TIMER_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (canScheduleExact(context)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            }
            AlarmStore.saveActiveTimer(context, triggerAtMillis, label)
            Log.d(TAG, "Системный таймер запланирован на $triggerAtMillis")
            return true
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException при установке таймера: ${e.message}")
            return false
        }
    }

    /**
     * Отмена системного таймера.
     */
    fun cancelTimer(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_TIMER_TRIGGER
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            TIMER_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.cancel(pendingIntent)
        pendingIntent.cancel()
        AlarmStore.clearActiveTimer(context)
        Log.d(TAG, "Системный таймер отменён")
    }

    /**
     * Восстановление всех активных расписаний после перезагрузки, обновления пакета
     * или смены часового пояса/времени.
     */
    fun rescheduleAll(context: Context): Int {
        val alarms = AlarmStore.getAllAlarms(context)
        var restoredCount = 0

        for (alarm in alarms) {
            if (alarm.enabled) {
                val ok = scheduleAlarm(context, alarm)
                if (ok) restoredCount++
            }
        }

        // Восстанавливаем активный таймер, если время ещё не истекло
        val activeTimer = AlarmStore.getActiveTimer(context)
        if (activeTimer != null) {
            val (endMs, label) = activeTimer
            val remainingSecs = ((endMs - System.currentTimeMillis()) / 1000).toInt()
            if (remainingSecs > 0) {
                scheduleTimer(context, remainingSecs, label)
            } else {
                AlarmStore.clearActiveTimer(context)
            }
        }

        Log.d(TAG, "Восстановлено будильников: $restoredCount из ${alarms.size}")
        return restoredCount
    }
}
