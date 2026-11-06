package org.metaschool.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface

class MetaSchoolNativeBridge(private val context: Context) {

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
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
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
    fun scheduleBellAlarm(triggerAtMillis: Long, title: String, message: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("title", title)
            putExtra("message", message)
            putExtra("channelId", NotificationHelper.CHANNEL_BELLS_ID)
            putExtra("id", (triggerAtMillis % 100000).toInt())
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            triggerAtMillis.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

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

    @JavascriptInterface
    fun playVibrate(durationMs: Long) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                v.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                @Suppress("DEPRECATION")
                v.vibrate(durationMs)
            }
        } catch (_: Exception) {}
    }
}
