package com.nongyu.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File
import android.app.PendingIntent
import android.content.Intent
import android.content.ComponentName

class TodayCourseWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.nongyu.app.UPDATE_WIDGET") {
             val appWidgetManager = AppWidgetManager.getInstance(context)
             val thisAppWidget = ComponentName(context.packageName, TodayCourseWidget::class.java.name)
             val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
             onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    val views = RemoteViews(context.packageName, R.layout.widget_today_course)
    
    // Create intent for update
    val intent = Intent(context, TodayCourseWidget::class.java)
    intent.action = "com.nongyu.app.UPDATE_WIDGET"
    val pendingIntent = PendingIntent.getBroadcast(
        context, 
        0, 
        intent, 
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent) // Need to add id to root layout

    val file = File(context.filesDir, "widget_data.json")
    if (file.exists()) {
        try {
            val jsonStr = file.readText()
            val json = JSONObject(jsonStr)
            
            val title = json.optString("title", "今日无课")
            val info = json.optString("info", "好好休息吧")
            val updateTime = json.optString("updateTime", "")
            val date = json.optString("date", "")

            // New fields
            val courseName = json.optString("courseName", title)
            val teacher = json.optString("teacher", "")
            val room = json.optString("room", "")
            val timeRange = json.optString("timeRange", "")
            val seat = json.optString("seat", "")
            val hasCourse = json.optBoolean("hasCourse", false)
            val mode = json.optString("mode", "")
            
            views.setTextViewText(R.id.widget_course_name, courseName)
            views.setTextViewText(R.id.widget_update_time, "更新于: $updateTime")
            views.setTextViewText(R.id.widget_date, date)
            
            // Clear seat by default
            views.setTextViewText(R.id.widget_seat, "")
            
            if (mode == "exam") {
                views.setTextViewText(R.id.widget_label_next, "下一堂考试：")
                views.setTextViewText(R.id.widget_time_range, "$date $timeRange")
                views.setTextViewText(R.id.widget_teacher, "方式: $teacher")
                views.setTextViewText(R.id.widget_room, "地点: $room")
                if (seat.isNotEmpty()) {
                    views.setTextViewText(R.id.widget_seat, "座位: $seat")
                }
            } else if (mode == "semester_end") {
                views.setTextViewText(R.id.widget_label_next, "农屿提醒您")
                views.setTextViewText(R.id.widget_teacher, info)
                views.setTextViewText(R.id.widget_room, "")
                views.setTextViewText(R.id.widget_time_range, "")
            } else if (hasCourse || mode == "course") {
                views.setTextViewText(R.id.widget_label_next, "农屿提醒您，下节课是：")
                views.setTextViewText(R.id.widget_time_range, timeRange)
                views.setTextViewText(R.id.widget_teacher, "教师: $teacher")
                views.setTextViewText(R.id.widget_room, "地点: $room")
            } else if (mode == "course_end") {
                views.setTextViewText(R.id.widget_label_next, "川农er你好，今天的课已经上完啦~")
                views.setTextViewText(R.id.widget_time_range, "")
                views.setTextViewText(R.id.widget_teacher, info)
                views.setTextViewText(R.id.widget_room, "")
            } else {
                views.setTextViewText(R.id.widget_label_next, "川农er你好，今天的课已经上完啦~")
                views.setTextViewText(R.id.widget_time_range, "")
                views.setTextViewText(R.id.widget_teacher, info) 
                views.setTextViewText(R.id.widget_room, "")
            }
            
        } catch (e: Exception) {
            views.setTextViewText(R.id.widget_course_name, "数据解析错误")
            views.setTextViewText(R.id.widget_teacher, e.message)
        }
    } else {
        // Try to compute from schedule file without launching app
        val sched = File(context.filesDir, "widget_schedule.json")
        if (sched.exists()) {
           try {
             val s = JSONObject(sched.readText())
             val semesterStart = s.optString("semesterStart", "")
             val coursesArr = s.optJSONArray("courses")
             
             val now = java.util.Calendar.getInstance()
             val day = now.get(java.util.Calendar.DAY_OF_WEEK)
             val today = if (day == java.util.Calendar.SUNDAY) 7 else day - 1 // 1-7
             
             var currentWeek = 1
             if (semesterStart.isNotEmpty()) {
               try {
                 val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
                 val startDate = sdf.parse(semesterStart)
                 if (startDate != null) {
                   val diff = now.timeInMillis - startDate.time
                   val days = (diff / (1000L*60L*60L*24L)).toInt()
                   currentWeek = (days / 7) + 1
                   if (currentWeek < 1) currentWeek = 1
                 }
               } catch (_: Exception) {}
             }
             
             // Course times mapping (end minutes for filtering next)
             val startTimes = arrayOf("08:10","09:05","10:10","11:05","14:20","15:15","16:20","17:15","19:30","20:25")
             val endTimes   = arrayOf("08:55","09:50","10:55","11:50","15:05","16:00","17:05","18:00","20:15","21:10")
             fun minutes(t: String): Int {
               val parts = t.split(":")
               return parts[0].toInt()*60 + parts[1].toInt()
             }
             
             val nowMin = now.get(java.util.Calendar.HOUR_OF_DAY)*60 + now.get(java.util.Calendar.MINUTE)
             
             // weekMatches
             fun weekMatches(week: Int, obj: JSONObject): Boolean {
               val weeksObj = obj.optJSONObject("weeks")
               val wStart = weeksObj?.optInt("start", 1) ?: 1
               val wEnd = weeksObj?.optInt("end", 1) ?: 1
               if (week < wStart || week > wEnd) return false
               val odd = obj.optBoolean("odd", false)
               val even = obj.optBoolean("even", false)
               if (odd && week % 2 == 0) return false
               if (even && week % 2 == 1) return false
               val list = obj.optJSONArray("weeksList")
               if (list != null && list.length() > 0) {
                 var hit = false
                 for (i in 0 until list.length()) {
                   if (list.optInt(i) == week) { hit = true; break }
                 }
                 if (!hit) return false
               }
               return true
             }
             
             // Find today's upcoming course
             var chosen: JSONObject? = null
             if (coursesArr != null) {
               val todayList = mutableListOf<JSONObject>()
               for (i in 0 until coursesArr.length()) {
                 val c = coursesArr.optJSONObject(i)
                 if (c != null && c.optInt("day", 0) == today && weekMatches(currentWeek, c)) {
                   todayList.add(c)
                 }
               }
               // sort by startPeriod
               todayList.sortBy { it.optInt("startPeriod", 1) }
               for (c in todayList) {
                 val endP = c.optInt("endPeriod", 1)
                 val idx = kotlin.math.max(1, kotlin.math.min(endP, endTimes.size)) - 1
                 val endM = minutes(endTimes[idx])
                 if (endM > nowMin) { chosen = c; break }
               }
             }
             
             if (chosen != null) {
               val name = chosen.optString("name", "课程")
               val room = chosen.optString("room", "未知教室")
               val sp = chosen.optInt("startPeriod", 1)
               val ep = chosen.optInt("endPeriod", 1)
               val si = kotlin.math.max(1, kotlin.math.min(sp, startTimes.size)) - 1
               val ei = kotlin.math.max(1, kotlin.math.min(ep, endTimes.size)) - 1
               val timeRange = "${startTimes[si]}-${endTimes[ei]}"
               
               views.setTextViewText(R.id.widget_course_name, name)
               views.setTextViewText(R.id.widget_label_next, "农屿提醒您，下节课是：")
               views.setTextViewText(R.id.widget_time_range, timeRange)
               views.setTextViewText(R.id.widget_teacher, "")
               views.setTextViewText(R.id.widget_room, "地点: $room")
               
               val dateStr = "${now.get(java.util.Calendar.MONTH)+1}月${now.get(java.util.Calendar.DAY_OF_MONTH)}日 周${arrayOf("日","一","二","三","四","五","六")[day-1]}"
               val timeStr = "${now.get(java.util.Calendar.HOUR_OF_DAY).toString().padStart(2,'0')}:${now.get(java.util.Calendar.MINUTE).toString().padStart(2,'0')}"
               views.setTextViewText(R.id.widget_date, dateStr)
               views.setTextViewText(R.id.widget_update_time, "更新于: $timeStr")
             } else {
               views.setTextViewText(R.id.widget_course_name, "今日无课")
               views.setTextViewText(R.id.widget_label_next, "川农er你好，今天的课已经上完啦~")
               views.setTextViewText(R.id.widget_time_range, "")
               views.setTextViewText(R.id.widget_teacher, "好好休息吧")
               views.setTextViewText(R.id.widget_room, "")
               
               val dateStr = "${now.get(java.util.Calendar.MONTH)+1}月${now.get(java.util.Calendar.DAY_OF_MONTH)}日 周${arrayOf("日","一","二","三","四","五","六")[day-1]}"
               val timeStr = "${now.get(java.util.Calendar.HOUR_OF_DAY).toString().padStart(2,'0')}:${now.get(java.util.Calendar.MINUTE).toString().padStart(2,'0')}"
               views.setTextViewText(R.id.widget_date, dateStr)
               views.setTextViewText(R.id.widget_update_time, "更新于: $timeStr")
             }
           } catch (e: Exception) {
             views.setTextViewText(R.id.widget_course_name, "数据解析错误")
             views.setTextViewText(R.id.widget_teacher, e.message)
           }
        } else {
           views.setTextViewText(R.id.widget_course_name, "暂无数据")
           views.setTextViewText(R.id.widget_teacher, "请打开农屿app刷新课表")
        }
    }

    appWidgetManager.updateAppWidget(appWidgetId, views)
}
