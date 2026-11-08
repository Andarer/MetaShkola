package org.metaschool.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

/**
 * Надёжное постоянное хранилище расписаний будильников и таймеров Android.
 * Сохраняет данные в SharedPreferences, обеспечивая восстановление после
 * перезагрузки, обновления приложения или закрытия WebView.
 */
object AlarmStore {
    private const val PREFS_NAME = "metaschool_alarms_store"
    private const val KEY_ALARMS = "alarms_json"
    private const val KEY_TIMER_END = "timer_end_time_ms"
    private const val KEY_TIMER_LABEL = "timer_label"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Synchronized
    fun getAllAlarms(context: Context): List<AlarmModel> {
        val jsonStr = getPrefs(context).getString(KEY_ALARMS, null) ?: return emptyList()
        val list = mutableListOf<AlarmModel>()
        try {
            val arr = JSONArray(jsonStr)
            for (i in 0 until arr.length()) {
                val item = arr.getJSONObject(i)
                list.add(AlarmModel.fromJson(item))
            }
        } catch (_: Exception) {}
        return list
    }

    @Synchronized
    fun getAlarm(context: Context, id: String): AlarmModel? {
        return getAllAlarms(context).find { it.id == id }
    }

    @Synchronized
    fun saveAlarm(context: Context, alarm: AlarmModel) {
        val current = getAllAlarms(context).toMutableList()
        val idx = current.indexOfFirst { it.id == alarm.id }
        if (idx >= 0) {
            current[idx] = alarm
        } else {
            current.add(alarm)
        }
        saveAll(context, current)
    }

    @Synchronized
    fun removeAlarm(context: Context, id: String) {
        val current = getAllAlarms(context).filter { it.id != id }
        saveAll(context, current)
    }

    @Synchronized
    fun setAlarmEnabled(context: Context, id: String, enabled: Boolean) {
        val current = getAllAlarms(context).toMutableList()
        val idx = current.indexOfFirst { it.id == id }
        if (idx >= 0) {
            current[idx] = current[idx].copy(enabled = enabled)
            saveAll(context, current)
        }
    }

    private fun saveAll(context: Context, list: List<AlarmModel>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        getPrefs(context).edit().putString(KEY_ALARMS, arr.toString()).apply()
    }

    // --- Active Timer Persistence ---

    @Synchronized
    fun saveActiveTimer(context: Context, targetEndTimeMs: Long, label: String) {
        getPrefs(context).edit()
            .putLong(KEY_TIMER_END, targetEndTimeMs)
            .putString(KEY_TIMER_LABEL, label)
            .apply()
    }

    @Synchronized
    fun clearActiveTimer(context: Context) {
        getPrefs(context).edit()
            .remove(KEY_TIMER_END)
            .remove(KEY_TIMER_LABEL)
            .apply()
    }

    @Synchronized
    fun getActiveTimer(context: Context): Pair<Long, String>? {
        val prefs = getPrefs(context)
        val endMs = prefs.getLong(KEY_TIMER_END, 0L)
        val label = prefs.getString(KEY_TIMER_LABEL, "Таймер") ?: "Таймер"
        return if (endMs > 0L) Pair(endMs, label) else null
    }
}
