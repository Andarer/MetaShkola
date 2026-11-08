package org.metaschool.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Приёмник системных событий перезагрузки, обновления пакета и изменения времени.
 * Восстанавливает все запланированные будильники и активный таймер из AlarmStore.
 */
class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "BootReceiver получил action: $action")

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                // 1. Инициализируем каналы уведомлений
                NotificationHelper.createNotificationChannels(context)

                // 2. Реальное восстановление всех активных будильников и таймеров
                val restored = AlarmScheduler.rescheduleAll(context)
                Log.d(TAG, "Расписание успешно восстановлено после события '$action'. Активных будильников: $restored")
            }
        }
    }
}
