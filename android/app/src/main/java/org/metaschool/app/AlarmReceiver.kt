package org.metaschool.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra("title") ?: "MetaШкола"
        val message = intent.getStringExtra("message") ?: "Уведомление расписания"
        val channelId = intent.getStringExtra("channelId") ?: NotificationHelper.CHANNEL_BELLS_ID
        val id = intent.getIntExtra("id", System.currentTimeMillis().toInt())

        NotificationHelper.showNotification(context, id, channelId, title, message)
    }
}
