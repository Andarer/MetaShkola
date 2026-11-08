package org.metaschool.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * Приёмник системных событий AlarmManager для будильников и таймеров.
 * При срабатывании будильника выполняет звуковое/вибрационное оповещение,
 * показывает системное уведомление и автоматически перепланирует повторяющиеся будильники.
 */
class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Получен сигнал тревоги, action: $action")

        when (action) {
            AlarmScheduler.ACTION_ALARM_TRIGGER -> {
                val alarmId = intent.getStringExtra("alarmId") ?: return
                val label = intent.getStringExtra("label") ?: "Будильник"
                val sound = intent.getStringExtra("sound") ?: "school"
                val time = intent.getStringExtra("time") ?: ""

                // 1. Показываем системное уведомление высокого приоритета
                val notifId = alarmId.hashCode()
                NotificationHelper.showNotification(
                    context,
                    notifId,
                    NotificationHelper.CHANNEL_BELLS_ID,
                    "⏰ $label ($time)",
                    "Сигнал будильника MetaШкола"
                )

                // 2. Вибрация
                triggerVibration(context)

                // 3. Автоматическое планирование следующего срабатывания для повторяющихся будильников
                val stored = AlarmStore.getAlarm(context, alarmId)
                if (stored != null) {
                    if (stored.days.isNotEmpty()) {
                        // Повторяющийся будильник: планируем следующий день
                        AlarmScheduler.scheduleAlarm(context, stored)
                        Log.d(TAG, "Повторяющийся будильник $alarmId автоматически перепланирован на следующий день")
                    } else {
                        // Однократный будильник: выключаем
                        AlarmStore.setAlarmEnabled(context, alarmId, false)
                        Log.d(TAG, "Однократный будильник $alarmId завершён и отключён")
                    }
                }
            }

            AlarmScheduler.ACTION_TIMER_TRIGGER -> {
                val label = intent.getStringExtra("label") ?: "Таймер"
                NotificationHelper.showNotification(
                    context,
                    999999,
                    NotificationHelper.CHANNEL_ALERTS_ID,
                    "⏱️ $label",
                    "Время таймера истекло!"
                )
                triggerVibration(context)
                AlarmStore.clearActiveTimer(context)
                Log.d(TAG, "Системный таймер успешно сработал")
            }

            else -> {
                // Обработка звонков по расписанию уроков
                val title = intent.getStringExtra("title") ?: "MetaШкола"
                val message = intent.getStringExtra("message") ?: "Уведомление расписания"
                val channelId = intent.getStringExtra("channelId") ?: NotificationHelper.CHANNEL_BELLS_ID
                val id = intent.getIntExtra("id", (System.currentTimeMillis() % 100000).toInt())

                NotificationHelper.showNotification(context, id, channelId, title, message)
                triggerVibration(context)
            }
        }
    }

    private fun triggerVibration(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 400, 200, 400, 200, 600), -1)
                )
            } else {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                v?.vibrate(longArrayOf(0, 400, 200, 400, 200, 600), -1)
            }
        } catch (_: Exception) {}
    }
}
