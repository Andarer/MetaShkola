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
                "Системные уведомления",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Синхронизация и обновления MetaШкола"
            }

            notificationManager.createNotificationChannel(bellsChannel)
            notificationManager.createNotificationChannel(tasksChannel)
            notificationManager.createNotificationChannel(alertsChannel)
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

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 250, 150, 250))
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (_: SecurityException) {
            // Handled when POST_NOTIFICATIONS is not yet granted
        }
    }
}
