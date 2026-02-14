// App入口：配置底部Tab导航与全局UI Provider与主题切换
// 说明：根据“农屿app需求文档”，底部Tab从左到右为：首页、课程、广场、个人。
// 本文件提供页面骨架与占位文案，主题相关逻辑已抽离到 src/theme 模块。
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  Provider as PaperProvider,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { themeStore } from '@/theme';
import RootTabs from '@/navigation/RootTabs';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

// App根组件：包裹全局UI与导航容器
const App = observer(() => {
  // 首次启动时加载主题偏好
  useEffect(() => {
    themeStore.load();
  }, []);

  // 在主题尚未准备好之前，可渲染简单占位（避免主题抖动）
  if (!themeStore.ready) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={themeStore.paperTheme}>
          <View style={styles['app__screen']}>
            <Text style={styles['app__text']}>加载主题中...</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={themeStore.paperTheme}>
        <ErrorBoundary>
          <NavigationContainer theme={themeStore.navTheme}>
            <RootTabs />
          </NavigationContainer>
        </ErrorBoundary>
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
});

export default App;

const styles = StyleSheet.create({
  app__screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  app__text: {
    fontSize: 20,
    color: '#333',
  },
});
