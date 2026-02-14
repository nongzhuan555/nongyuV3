// 根部Tab导航：负责组织底部四个主要页面
// 说明：当前仅连接到占位视图（Home/Course/Square/Profile），后续可替换为各自的Stack
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Home from '@/modules/Home';
import Course from '@/modules/Course';
import Square from '@/modules/Square';
import Profile from '@/modules/Profile';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false }} tabBar={(p) => <TabBar {...p} />}>
      <Tab.Screen name="首页" component={Home} />
      <Tab.Screen name="课表" component={Course} />
      <Tab.Screen name="广场" component={Square} />
      <Tab.Screen name="个人" component={Profile} />
    </Tab.Navigator>
  );
}

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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
    const iconTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    const labelOpacity = progress;
    const labelTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const iconName =
      route.name === '首页'
        ? 'home-variant-outline'
        : route.name === '课表'
        ? 'calendar-month-outline'
        : route.name === '广场'
        ? 'forum-outline'
        : 'account-outline';

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
            <MaterialCommunityIcons name={iconName as any} size={24} color={colors.primary as string} />
          </Animated.View>
          <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
            <MaterialCommunityIcons name={iconName as any} size={24} color={colors.text as string} />
          </Animated.View>
        </Animated.View>
        <Animated.Text
          style={[
            styles['tabbar__label'],
            { color: colors.primary as string, opacity: labelOpacity, transform: [{ translateY: labelTranslateY }] },
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
          { backgroundColor: colors.card, borderColor: (colors as any).border ?? 'rgba(0,0,0,0.06)' },
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
    marginHorizontal: 16,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  'tabbar__content': {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  'tabbar__item': {
    width: 68,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  'tabbar__iconWrap': {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  'tabbar__label': {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
  },
});
