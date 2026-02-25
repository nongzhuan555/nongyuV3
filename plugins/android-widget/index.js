const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidWidget = (config) => {
  // 1. Modify AndroidManifest.xml to add the receiver
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    if (!app.receiver) {
      app.receiver = [];
    }

    const receiverName = 'com.nongyu.app.TodayCourseWidget';
    // Check for duplicates
    if (!app.receiver.some(r => r.$['android:name'] === receiverName)) {
      app.receiver.push({
        $: {
          'android:name': receiverName,
          'android:label': '农屿今日课表',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/today_course_widget_info',
            },
          },
        ],
      });
    }
    return config;
  });

  // 2. Copy source files
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppPath = path.join(projectRoot, 'android', 'app', 'src', 'main');
      
      // Source paths (in our plugins folder)
      // Note: we use 'src' instead of 'android' to avoid being ignored by .easignore
      const pluginDir = path.join(projectRoot, 'plugins', 'android-widget', 'src');
      const widgetKtSource = path.join(pluginDir, 'src', 'main', 'java', 'com', 'nongyu', 'app', 'TodayCourseWidget.kt');
      const layoutSource = path.join(pluginDir, 'res', 'layout', 'widget_today_course.xml');
      const infoSource = path.join(pluginDir, 'res', 'xml', 'today_course_widget_info.xml');

      // Destination paths
      // Note: We assume the package is com.nongyu.app. If it changes, this path needs update.
      const widgetKtDest = path.join(androidAppPath, 'java', 'com', 'nongyu', 'app', 'TodayCourseWidget.kt');
      const layoutDestDir = path.join(androidAppPath, 'res', 'layout');
      const infoDestDir = path.join(androidAppPath, 'res', 'xml');

      // Ensure destination directories exist
      // For Java file, we need to ensure the full package path exists
      const widgetKtDestDir = path.dirname(widgetKtDest);
      if (!fs.existsSync(widgetKtDestDir)) fs.mkdirSync(widgetKtDestDir, { recursive: true });
      if (!fs.existsSync(layoutDestDir)) fs.mkdirSync(layoutDestDir, { recursive: true });
      if (!fs.existsSync(infoDestDir)) fs.mkdirSync(infoDestDir, { recursive: true });

      // Define XML content inline to ensure reliability
      const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="320dp"
    android:minHeight="120dp"
    android:updatePeriodMillis="1800000"
    android:previewImage="@mipmap/ic_launcher"
    android:initialLayout="@layout/widget_today_course"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

      const widgetBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <gradient
        android:startColor="#E3F2FD"
        android:endColor="#FFFFFF"
        android:angle="270" />
    <corners android:radius="16dp" />
</shape>`;

      const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="16dp">

    <!-- Header: Label and Time -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="4dp">
        
        <TextView
            android:id="@+id/widget_label_next"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="农屿提醒您，下节课是："
            android:textSize="10sp"
            android:textColor="#666666"
            android:letterSpacing="0.05"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_time_range"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="--:--"
            android:textSize="14sp"
            android:textColor="#2196F3"
            android:textStyle="bold" />
    </LinearLayout>

    <!-- Course Name -->
    <TextView
        android:id="@+id/widget_course_name"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:text="加载中..."
        android:textSize="20sp"
        android:textColor="#333333"
        android:textStyle="bold"
        android:gravity="center_vertical"
        android:includeFontPadding="false"
        android:ellipsize="end"
        android:maxLines="2" />

    <!-- Details: Teacher and Room -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:layout_marginTop="4dp">

        <TextView
            android:id="@+id/widget_teacher"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=""
            android:textSize="12sp"
            android:textColor="#666666"
            android:drawablePadding="4dp" />

        <TextView
            android:id="@+id/widget_seat"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=""
            android:textSize="12sp"
            android:textColor="#666666"
            android:layout_marginTop="2dp"
            android:drawablePadding="4dp" />

        <TextView
            android:id="@+id/widget_room"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=""
            android:textSize="12sp"
            android:textColor="#666666"
            android:layout_marginTop="2dp"
            android:drawablePadding="4dp" />
    </LinearLayout>
    
    <!-- Footer: Date and Update Time -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginTop="4dp">

        <TextView
            android:id="@+id/widget_date"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text=""
            android:textSize="10sp"
            android:textColor="#999999" />

        <TextView
            android:id="@+id/widget_update_time"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=""
            android:textSize="8sp"
            android:textColor="#CCCCCC" />
    </LinearLayout>

</LinearLayout>`;

      // Copy Kotlin file
      if (fs.existsSync(widgetKtSource)) {
        fs.copyFileSync(widgetKtSource, widgetKtDest);
      } else {
        throw new Error('Widget Kotlin source not found at ' + widgetKtSource);
      }

      // Write XML files directly
      fs.writeFileSync(path.join(layoutDestDir, 'widget_today_course.xml'), widgetLayoutXml);
      fs.writeFileSync(path.join(infoDestDir, 'today_course_widget_info.xml'), widgetInfoXml);
      
      // Write background drawable
      const drawableDestDir = path.join(androidAppPath, 'res', 'drawable');
      if (!fs.existsSync(drawableDestDir)) fs.mkdirSync(drawableDestDir, { recursive: true });
      fs.writeFileSync(path.join(drawableDestDir, 'widget_background.xml'), widgetBackgroundXml);



      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidWidget;
