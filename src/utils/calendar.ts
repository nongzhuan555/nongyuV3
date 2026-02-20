import { Platform, Alert, Linking } from 'react-native';

let IntentLauncher: any = null;
if (Platform.OS === 'android') {
  try {
    IntentLauncher = require('expo-intent-launcher');
  } catch (e) {
    console.warn('expo-intent-launcher is not installed or available', e);
  }
}

// Android Intent 方式添加日历
async function addEventViaIntent(
  title: string,
  startDate: Date,
  endDate: Date,
  location?: string,
  notes?: string
) {
  try {
    if (!IntentLauncher) {
      console.warn('IntentLauncher module is not loaded');
      Alert.alert('组件缺失', '无法启动日历组件');
      return false;
    }

    // 构造更详细的描述信息，引导用户设置提醒
    let enhancedDescription = notes || '';
    enhancedDescription += '\n\n📝 温馨提示：\n建议在下方“添加通知”中设置【课前15分钟】提醒，以免错过课程。';

    const contentParams: any = {
      title,
      description: enhancedDescription,
      beginTime: startDate.getTime(),
      endTime: endDate.getTime(),
      eventLocation: location,
      // 额外字段：帮助系统日历更好地初始化事件
      eventTimezone: 'Asia/Shanghai', // 明确时区
      hasAlarm: 1,      // 提示系统日历默认开启提醒（具体行为取决于日历App）
      availability: 0,  // 设为“忙碌” (AVAILABILITY_BUSY = 0)
      accessLevel: 3,   // 设为“私有” (ACCESS_OWNER = 3)
    };
    
    // 使用 IntentLauncher 启动系统日历编辑页面
    await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
      data: 'content://com.android.calendar/events',
      extra: contentParams,
    });
    return true;
  } catch (e) {
    console.warn('Failed to open calendar via Intent', e);
    Alert.alert('跳转失败', '无法打开系统日历');
    return false;
  }
}

export const addEventToCalendar = async (
  title: string,
  startDate: Date,
  endDate: Date,
  location?: string,
  notes?: string
) => {
  try {
    console.log('addEventToCalendar called with:', {
      title,
      startDate: startDate.toString(),
      endDate: endDate.toString(),
      location,
      notes,
    });

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid Date provided:', { startDate, endDate });
      Alert.alert('添加失败', '日期无效');
      return;
    }

    if (endDate <= startDate) {
      console.error('EndDate is not after StartDate:', { startDate, endDate });
      Alert.alert('添加失败', '结束时间不能早于开始时间');
      return;
    }

    // Android 使用 Intent 方式
    if (Platform.OS === 'android') {
      await addEventViaIntent(title, startDate, endDate, location, notes);
      return;
    }

    // iOS 提示手动添加
    Alert.alert(
      '提示',
      '即将打开日历应用，请手动添加日程。',
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '打开日历',
          onPress: () => Linking.openURL('calshow:')
        }
      ]
    );

  } catch (error) {
    console.error('Failed to add calendar event:', error);
    Alert.alert('添加失败', '发生未知错误');
  }
};
