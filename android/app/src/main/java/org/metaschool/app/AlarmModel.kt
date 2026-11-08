package org.metaschool.app

import org.json.JSONArray
import org.json.JSONObject

/**
 * Модель будильника для надёжного нативного хранения в Android.
 * Дни недели: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб (совместимо с JavaScript getDay())
 */
data class AlarmModel(
    val id: String,
    val time: String, // "HH:mm"
    val days: List<Int>,
    val label: String,
    val sound: String,
    val enabled: Boolean,
    val profileId: String? = null
) {
    fun toJson(): JSONObject {
        val obj = JSONObject()
        obj.put("id", id)
        obj.put("time", time)
        val arr = JSONArray()
        days.forEach { arr.put(it) }
        obj.put("days", arr)
        obj.put("label", label)
        obj.put("sound", sound)
        obj.put("enabled", enabled)
        obj.put("profileId", profileId ?: "")
        return obj
    }

    companion object {
        fun fromJson(obj: JSONObject): AlarmModel {
            val daysList = mutableListOf<Int>()
            val arr = obj.optJSONArray("days")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    daysList.add(arr.getInt(i))
                }
            }
            return AlarmModel(
                id = obj.getString("id"),
                time = obj.getString("time"),
                days = daysList,
                label = obj.optString("label", "Будильник"),
                sound = obj.optString("sound", "school"),
                enabled = obj.optBoolean("enabled", true),
                profileId = obj.optString("profileId").takeIf { it.isNotEmpty() }
            )
        }
    }
}
