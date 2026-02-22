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

    const receiverName = '.TodayCourseWidget';
    // Check for duplicates
    if (!app.receiver.some(r => r.$['android:name'] === receiverName)) {
      app.receiver.push({
        $: {
          'android:name': receiverName,
          'android:label': '今日课表',
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
      const pluginDir = path.join(projectRoot, 'plugins', 'android-widget', 'android');
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

      const widgetLayoutXml = `<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#F5F5F5"
    android:padding="16dp">

    <TextView
        android:id="@+id/widget_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="今日课表"
        android:textSize="14sp"
        android:textColor="#666666" />

    <TextView
        android:id="@+id/widget_course_name"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="加载中..."
        android:textSize="18sp"
        android:textStyle="bold"
        android:textColor="#000000"
        android:layout_marginTop="8dp" />

    <TextView
        android:id="@+id/widget_course_info"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text=""
        android:textSize="14sp"
        android:textColor="#333333"
        android:layout_marginTop="4dp" />
        
    <TextView
        android:id="@+id/widget_update_time"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text=""
        android:textSize="10sp"
        android:textColor="#999999"
        android:layout_marginTop="8dp"
        android:gravity="end" />

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


      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidWidget;
