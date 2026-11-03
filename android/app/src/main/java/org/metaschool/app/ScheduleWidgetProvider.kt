package org.metaschool.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.util.Calendar

class ScheduleWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
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

            val views = RemoteViews(context.packageName, R.layout.schedule_widget).apply {
                setOnClickPendingIntent(R.id.widget_title, pendingIntent)

                val cal = Calendar.getInstance()
                val hour = cal.get(Calendar.HOUR_OF_DAY)
                val minute = cal.get(Calendar.MINUTE)

                if (hour < 8) {
                    setTextViewText(R.id.widget_status, "До начала уроков")
                    setTextViewText(R.id.widget_lesson_detail, "1 урок: Алгебра (08:00–08:45)")
                    setTextViewText(R.id.widget_badge, "Каб. 204 · Звонок через ${8 * 60 - (hour * 60 + minute)} мин")
                } else if (hour < 14) {
                    setTextViewText(R.id.widget_status, "Идет учебный день")
                    setTextViewText(R.id.widget_lesson_detail, "Текущий урок / Перемена")
                    setTextViewText(R.id.widget_badge, "Расписание активно · MetaШкола")
                } else {
                    setTextViewText(R.id.widget_status, "Уроки завершены")
                    setTextViewText(R.id.widget_lesson_detail, "Проверьте домашние задания")
                    setTextViewText(R.id.widget_badge, "Задания на завтра доступны")
                }

                setTextViewText(R.id.widget_bell_time, String.format("%02d:%02d", hour, minute))
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
