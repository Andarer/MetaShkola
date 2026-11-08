package org.metaschool.app

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONArray

/**
 * Нативный шлюз (JavascriptInterface) для взаимодействия Web-интерфейса MetaШкола
 * с операционной системой Android. Обеспечивает строгий контракт управления будильниками,
 * системным таймером, виджетом расписания и диагностикой устройства.
 */
class MetaSchoolNativeBridge(private val context: Context) {

    companion object {
        private const val TAG = "MetaSchoolNativeBridge"
    }

    @JavascriptInterface
    fun getPlatform(): String {
        return "android"
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            pInfo.versionName ?: "2.2.0"
        } catch (_: Exception) {
            "2.2.0"
        }
    }

    @JavascriptInterface
    fun getVersionCode(): Int {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode
            }
        } catch (_: Exception) {
            220
        }
    }

    @JavascriptInterface
    fun getDeviceModel(): String {
        return "${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE}, API ${Build.VERSION.SDK_INT})"
    }

    @JavascriptInterface
    fun isOnline(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val net = cm.activeNetwork ?: return false
            val cap = cm.getNetworkCapabilities(net) ?: return false
            return cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } else {
            @Suppress("DEPRECATION")
            val info = cm.activeNetworkInfo
            @Suppress("DEPRECATION")
            return info != null && info.isConnected
        }
    }

    // --- ALARM MANAGER INTEGRATION ---

    /**
     * Возвращает статус разрешения точных будильников на Android:
     * "granted" — разрешено,
     * "denied" — требуется специальное разрешение в настройках (Android 12+),
     * "unsupported" — не поддерживается устройством.
     */
    @JavascriptInterface
    fun getAlarmPermissionStatus(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (am != null && am.canScheduleExactAlarms()) "granted" else "denied"
        } else {
            "granted"
        }
    }

    /**
     * Открывает экран системных настроек для предоставления разрешения SCHEDULE_EXACT_ALARM.
     */
    @JavascriptInterface
    fun requestAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Не удалось открыть настройки точных будильников: ${e.message}")
            }
        }
    }

    /**
     * Планирование будильника через AlarmScheduler с поддержкой дней повторения.
     * @param id Уникальный идентификатор будильника
     * @param time Время в формате "HH:mm"
     * @param daysJson JSON-строка массива дней, например: "[1,2,3,4,5]"
     * @param label Название будильника
     * @param sound Звуковой профиль ("school", "digital", "gentle", "bell")
     */
     @JavascriptInterface
     fun scheduleAlarm(id: String, time: String, daysJson: String, label: String, sound: String): Boolean {
         val daysList = mutableListOf<Int>()
         try {
             val arr = JSONArray(daysJson)
             for (i in 0 until arr.length()) {
                 daysList.add(arr.getInt(i))
             }
         } catch (_: Exception) {}

         val alarm = AlarmModel(
             id = id,
             time = time,
             days = daysList,
             label = label,
             sound = sound,
             enabled = true
         )
         return AlarmScheduler.scheduleAlarm(context, alarm)
     }

    /**
     * Совместимая перегрузка с явным расчётом времени из timestamp:
     * Конвертирует переданный timestamp в точное время HH:mm, предотвращая фиктивные 07:30.
     */
    @JavascriptInterface
    fun scheduleAlarm(alarmId: String, triggerAtMillis: Long, title: String, message: String): Boolean {
        val cal = java.util.Calendar.getInstance().apply {
            timeInMillis = triggerAtMillis
        }
        val hour = cal.get(java.util.Calendar.HOUR_OF_DAY)
        val min = cal.get(java.util.Calendar.MINUTE)
        val formattedTime = String.format(java.util.Locale.US, "%02d:%02d", hour, min)

        val alarm = AlarmModel(
            id = alarmId,
            time = formattedTime,
            days = emptyList(), // однократный будильник
            label = title.ifEmpty { "Будильник" },
            sound = "school",
            enabled = true
        )
        return AlarmScheduler.scheduleAlarm(context, alarm)
    }

    /**
     * Отмена системного будильника.
     */
    @JavascriptInterface
    fun cancelAlarm(alarmId: String) {
        AlarmScheduler.cancelAlarm(context, alarmId)
    }

    /**
     * Принудительное восстановление всех будильников из локального хранилища.
     */
    @JavascriptInterface
    fun restoreAlarms(): Int {
        return AlarmScheduler.rescheduleAll(context)
    }

    // --- SYSTEM TIMER INTEGRATION ---

    /**
     * Планирование фонового таймера через системный AlarmManager.
     */
    @JavascriptInterface
    fun scheduleTimer(durationSeconds: Int, label: String): Boolean {
        return AlarmScheduler.scheduleTimer(context, durationSeconds, label)
    }

    /**
     * Отмена фонового таймера.
     */
    @JavascriptInterface
    fun cancelTimer() {
        AlarmScheduler.cancelTimer(context)
    }

    // --- NOTIFICATIONS & FEEDBACK ---

    @JavascriptInterface
    fun showNotification(title: String, message: String, channel: String?) {
        val targetChannel = when (channel) {
            "tasks" -> NotificationHelper.CHANNEL_TASKS_ID
            "alerts" -> NotificationHelper.CHANNEL_ALERTS_ID
            else -> NotificationHelper.CHANNEL_BELLS_ID
        }
        val notifId = (System.currentTimeMillis() % 100000).toInt()
        NotificationHelper.showNotification(context, notifId, targetChannel, title, message)
    }

    @JavascriptInterface
    fun playVibrate(durationMs: Long) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                v?.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                v?.vibrate(durationMs)
            }
        } catch (_: Exception) {}
    }

    // --- SCHEDULE WIDGET SYNC ---

    @JavascriptInterface
    fun syncScheduleData(currentLesson: String, nextLesson: String, bellStatus: String, badgeText: String) {
        try {
            val prefs = context.getSharedPreferences("metashkola_schedule", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("current_lesson", currentLesson)
                .putString("next_lesson", nextLesson)
                .putString("bell_status", bellStatus)
                .putString("badge_text", badgeText)
                .putLong("updated_at", System.currentTimeMillis())
                .apply()

            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, ScheduleWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                val updateIntent = Intent(context, ScheduleWidgetProvider::class.java).apply {
                    action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(updateIntent)
            }
        } catch (_: Exception) {}
    }
}
