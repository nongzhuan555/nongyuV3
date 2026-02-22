package com.nongyu.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File

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
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    val views = RemoteViews(context.packageName, R.layout.widget_today_course)
    
    val file = File(context.filesDir, "widget_data.json")
    if (file.exists()) {
        try {
            val jsonStr = file.readText()
            val json = JSONObject(jsonStr)
            
            val title = json.optString("title", "今日无课")
            val info = json.optString("info", "好好休息吧")
            val updateTime = json.optString("updateTime", "")
            
            views.setTextViewText(R.id.widget_course_name, title)
            views.setTextViewText(R.id.widget_course_info, info)
            views.setTextViewText(R.id.widget_update_time, "更新于: $updateTime")
            
        } catch (e: Exception) {
            views.setTextViewText(R.id.widget_course_name, "数据解析错误")
            views.setTextViewText(R.id.widget_course_info, e.message)
        }
    } else {
        views.setTextViewText(R.id.widget_course_name, "暂无数据")
        views.setTextViewText(R.id.widget_course_info, "请打开应用刷新课表")
    }

    appWidgetManager.updateAppWidget(appWidgetId, views)
}