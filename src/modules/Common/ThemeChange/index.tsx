import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Button, Menu, Text, useTheme } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { themeStore } from '@/theme';

const ThemeChange = observer(() => {
  const [visible, setVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const theme = useTheme();
  const overlayColor = theme.dark ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.06)';

  const currentLabel = useMemo(() => {
    if (themeStore.mode === 'system') return '跟随系统';
    if (themeStore.isDark) return '深色模式';
    return themeStore.brand === 'sakura' ? '樱花浅粉' : '浅绿色';
  }, [themeStore.isDark, themeStore.brand, themeStore.mode]);

  const startTransition = async (fn: () => Promise<void>) => {
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    await new Promise((r) => setTimeout(r, 160));
    await fn();
    await new Promise((r) => setTimeout(r, 100));
    await new Promise<void>((resolve) => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => resolve());
    });
  };

  const chooseLightGreen = () =>
    startTransition(async () => {
      await themeStore.setDark(false);
      await themeStore.setBrand('green');
    });

  const chooseSakura = () =>
    startTransition(async () => {
      await themeStore.setDark(false);
      await themeStore.setBrand('sakura');
    });

  const chooseDark = () =>
    startTransition(async () => {
      // 深色模式下使用绿色主色，保证品牌一致性
      await themeStore.setBrand('green');
      await themeStore.setDark(true);
    });
  const chooseSystem = () =>
    startTransition(async () => {
      await themeStore.setMode('system');
    });

  return (
    <View style={styles['wrap']}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchorPosition="bottom"
        contentStyle={[
          styles['menu'],
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
        anchor={
          <Button mode="outlined" onPress={() => setVisible(true)} style={styles['button']} >
            {`主题：${currentLabel}`}
          </Button>
        }
      >
        <Menu.Item leadingIcon="theme-light-dark" onPress={() => { setVisible(false); chooseSystem(); }} title="跟随系统" />
        <Menu.Item leadingIcon="leaf" onPress={() => { setVisible(false); chooseLightGreen(); }} title="浅绿色" />
        <Menu.Item leadingIcon="flower" onPress={() => { setVisible(false); chooseSakura(); }} title="樱花浅粉" />
        <Menu.Item leadingIcon="weather-night" onPress={() => { setVisible(false); chooseDark(); }} title="深色模式" />
      </Menu>
      <Animated.View
        pointerEvents="none"
        style={[
          styles['overlay'],
          { opacity: overlayOpacity, backgroundColor: overlayColor },
        ]}
      />
      <Text style={styles['hint']}>切换主题将全局生效并持久保存</Text>
    </View>
  );
});

export default ThemeChange;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  button: {
    borderRadius: 10,
  },
  menu: {
    minWidth: 180,
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.6,
  },
});
