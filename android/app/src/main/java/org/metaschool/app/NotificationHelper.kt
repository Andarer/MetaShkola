package org.metaschool.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object NotificationHelper {
    const val CHANNEL_BELLS_ID = "metaschool_bells"
    const val CHANNEL_TASKS_ID = "metaschool_tasks"
    const val CHANNEL_ALERTS_ID = "metaschool_alerts"

    // Sound profile channel IDs
    const val CHANNEL_ALARM_SCHOOL = "metaschool_alarm_school"
    const val CHANNEL_ALARM_DIGITAL = "metaschool_alarm_digital"
    const val CHANNEL_ALARM_GENTLE = "metaschool_alarm_gentle"
    const val CHANNEL_ALARM_DEFAULT = "metaschool_alarm_default"

    fun getAlarmChannelId(sound: String): String {
        return when (sound) {
            "school" -> CHANNEL_ALARM_SCHOOL
            "digital" -> CHANNEL_ALARM_DIGITAL
            "gentle" -> CHANNEL_ALARM_GENTLE
            else -> CHANNEL_ALARM_DEFAULT
        }
    }

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val bellsChannel = NotificationChannel(
                CHANNEL_BELLS_ID,
                "Звонки и Уроки",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Уведомления о начале и окончании уроков, переменах и звонках"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 150, 250)
            }

            val tasksChannel = NotificationChannel(
                CHANNEL_TASKS_ID,
                "Домашние задания и Календарь",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Напоминания о сроках домашних заданий и событиях"
            }

            val alertsChannel = NotificationChannel(
                CHANNEL_ALERTS_ID,
                "Системные уведомления и таймеры",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Синхронизация, таймеры и обновления MetaШкола"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 300)
            }

            // Create sound-specific channels for alarms
            val defaultSoundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
                ?: android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION)

            val audioAttributes = android.media.AudioAttributes.Builder()
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .build()

            val schoolAlarmChannel = NotificationChannel(
                CHANNEL_ALARM_SCHOOL,
                "Будильник: Школьный звонок",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Будильники со школьным звонком и ритмичной вибрацией"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 800)
                setSound(defaultSoundUri, audioAttributes)
            }

            val digitalAlarmChannel = NotificationChannel(
                CHANNEL_ALARM_DIGITAL,
                "Будильник: Электронный сигнал",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Электронный прерывистый сигнал и быстрая пульсация"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 200, 100, 200, 100, 200, 100, 400)
                setSound(defaultSoundUri, audioAttributes)
            }

            val gentleAlarmChannel = NotificationChannel(
                CHANNEL_ALARM_GENTLE,
                "Будильник: Мягкий сигнал",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Плавное пробуждение и мягкая вибрация"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 150, 400, 150, 400, 300)
                setSound(defaultSoundUri, audioAttributes)
            }

            val defaultAlarmChannel = NotificationChannel(
                CHANNEL_ALARM_DEFAULT,
                "Будильник: Стандартный",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Стандартный системный будильник"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                setSound(defaultSoundUri, audioAttributes)
            }

            notificationManager.createNotificationChannel(bellsChannel)
            notificationManager.createNotificationChannel(tasksChannel)
            notificationManager.createNotificationChannel(alertsChannel)
            notificationManager.createNotificationChannel(schoolAlarmChannel)
            notificationManager.createNotificationChannel(digitalAlarmChannel)
            notificationManager.createNotificationChannel(gentleAlarmChannel)
            notificationManager.createNotificationChannel(defaultAlarmChannel)
        }
    }

    fun showNotification(
        context: Context,
        notificationId: Int,
        channelId: String,
        title: String,
        content: String
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
            ?: android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION)

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setSound(soundUri)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 400, 200, 400, 200, 600))
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (_: SecurityException) {
            // Handled when POST_NOTIFICATIONS is not yet granted
        }
    }
}
