// 根部Tab导航：负责组织底部四个主要页面
// 说明：当前仅连接到占位视图（Home/Course/Square/Profile），后续可替换为各自的Stack
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Home from '@/modules/Home';
import Course from '@/modules/Course';
import Square from '@/modules/Square';
import Profile from '@/modules/Profile';
import { profileStore } from '@/stores/profile';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootTabs() {
  const initialRouteName = profileStore.defaultCourse ? '课表' : '首页';
  
  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
      backBehavior="history"
      tabBar={(p) => <TabBar {...p} />}
    >
      <Tab.Screen name="首页" component={Home} />
      <Tab.Screen name="课表" component={Course} />
      <Tab.Screen name="广场" component={Square} />
      <Tab.Screen name="个人" component={Profile} />
    </Tab.Navigator>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // 为每个tab维护一个进度值：激活态1，非激活0
  const progressesRef = React.useRef<Animated.Value[]>(
    state.routes.map((_, i) => new Animated.Value(state.index === i ? 1 : 0)),
  );
  React.useEffect(() => {
    if (progressesRef.current.length !== state.routes.length) {
      progressesRef.current = state.routes.map((_, i) => new Animated.Value(state.index === i ? 1 : 0));
    }
  }, [state.routes.length, state.index]);
  React.useEffect(() => {
    progressesRef.current.forEach((v, i) => {
      Animated.timing(v, {
        toValue: state.index === i ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  const items = state.routes.map((route, index) => {
    const isFocused = state.index === index;
    const progress = progressesRef.current[index] || new Animated.Value(isFocused ? 1 : 0);
    // 未激活时更大，激活时稍小；并在激活时向上位移为标签腾挪空间
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1.0] });
    const iconTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }); // 增加位移，给更大的文字留空间
    const labelOpacity = progress;
    const labelTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] =
      route.name === '首页'
        ? 'home'
        : route.name === '课表'
        ? 'calendar-month'
        : route.name === '广场'
        ? 'forum'
        : 'account';

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={route.name}
        onPress={onPress}
        style={styles['tabbar__item']}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles['tabbar__iconWrap'], { transform: [{ translateY: iconTranslateY }, { scale }] }]}>
          <Animated.View style={{ position: 'absolute', opacity: labelOpacity }}>
            <MaterialCommunityIcons name={iconName} size={28} color={colors.primary} />
          </Animated.View>
          <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
            <MaterialCommunityIcons name={iconName} size={28} color={colors.text} />
          </Animated.View>
        </Animated.View>
        <Animated.Text
          style={[
            styles['tabbar__label'],
            { color: colors.primary, opacity: labelOpacity, transform: [{ translateY: labelTranslateY }] },
          ]}
        >
          {route.name}
        </Animated.Text>
      </TouchableOpacity>
    );
  });

  return (
    <View
      style={[
        styles['tabbar__container'],
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View
        style={[
          styles['tabbar__bar'],
          { backgroundColor: 'transparent', borderColor: 'transparent' },
        ]}
      >
        <View style={styles['tabbar__content']}>{items}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  'tabbar__container': {
    paddingTop: 6,
  },
  'tabbar__bar': {
    marginHorizontal: 0, // 减小外边距，最大化宽度
    borderRadius: 0, // 取消圆角，变为沉浸式底栏
    paddingVertical: 8,
    paddingHorizontal: 12, // 保持适度内边距
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  'tabbar__content': {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24, // 增加内边距，使外侧Tab不贴边，且间距均匀
  },
  'tabbar__item': {
    width: 64, // 收窄点击区域，显著增加视觉间距
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  'tabbar__iconWrap': {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  'tabbar__label': {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
});
