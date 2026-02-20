// App入口：配置底部Tab导航与全局UI Provider与主题切换
// 说明：根据“农屿app需求文档”，底部Tab从左到右为：首页、课程、广场、个人。
// 本文件提供页面骨架与占位文案，主题相关逻辑已抽离到 src/theme 模块。
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Provider as PaperProvider,
  Snackbar,
  Portal,
} from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { themeStore } from '@/theme';
import { profileStore } from '@/stores/profile';
import { registerApp } from '@/utils/wechat';
import RootTabs from '@/navigation/RootTabs';
import JiaowuHome from '@/modules/Home/jiaowu';
import SecondHome from '@/modules/Home/second';
import SecondLogin from '@/modules/Home/second/Login';
import SecondActivityList from '@/modules/Home/second/ActivityList';
import SecondActivityDetail from '@/modules/Home/second/ActivityDetail';
import SecondUserInfo from '@/modules/Home/second/UserInfo';
import ProgressList from '@/modules/Home/jiaowu/progress';
import RankList from '@/modules/Home/jiaowu/rank';
import ScoreList from '@/modules/Home/jiaowu/score';
import NoticeDetail from '@/modules/Home/notice';
import JiaowuNotice from '@/modules/Home/jiaowu/notice';
import JiaowuCompetition from '@/modules/Home/jiaowu/competition';
import JiaowuExam from '@/modules/Home/jiaowu/exam';
import WebViewScreen from '@/components/WebViewScreen';
import Profile from '@/modules/Profile';
import Setting from '@/modules/Profile/components/Setting';
import { RootStackParamList } from '@/navigation/types';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { setRequestErrorHandler } from '@/shared/http';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppContent = observer(() => {
  const insets = useSafeAreaInsets();
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  useEffect(() => {
    setRequestErrorHandler(() => {
      setErrorKey((v) => v + 1);
      setErrorVisible(true);
    });
    return () => setRequestErrorHandler(null);
  }, []);

  const isNongyuLogged = !!profileStore.profile?.studentId?.trim();

  return (
    <>
      <ErrorBoundary>
        <NavigationContainer theme={themeStore.navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isNongyuLogged ? (
              // @ts-ignore
              <Stack.Screen name="Login" component={Profile} />
            ) : (
              <>
                <Stack.Screen name="RootTabs" component={RootTabs} />
                <Stack.Screen name="JiaowuHome" component={JiaowuHome} />
                <Stack.Screen name="JiaowuProgress" component={ProgressList} />
                <Stack.Screen name="JiaowuRank" component={RankList} />
                <Stack.Screen name="JiaowuScore" component={ScoreList} />
                <Stack.Screen name="SecondHome" component={SecondHome} />
                <Stack.Screen name="SecondLogin" component={SecondLogin} />
                <Stack.Screen name="SecondActivityList" component={SecondActivityList} />
                <Stack.Screen name="SecondActivityDetail" component={SecondActivityDetail} />
                <Stack.Screen name="SecondUserInfo" component={SecondUserInfo} />
                <Stack.Screen name="NoticeDetail" component={NoticeDetail} />
                <Stack.Screen name="JiaowuNotice" component={JiaowuNotice} />
                <Stack.Screen name="JiaowuCompetition" component={JiaowuCompetition} />
                <Stack.Screen name="JiaowuExam" component={JiaowuExam} />
                <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
                <Stack.Screen name="ProfileSetting" component={Setting} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
      <Portal>
        <View style={[styles['app__msgWrap'], { top: insets.top + 120 }]}>
          <Snackbar
            key={errorKey}
            visible={errorVisible}
            onDismiss={() => setErrorVisible(false)}
            duration={2200}
            style={styles['app__msgError']}
          >
            操作失败，请重试~
          </Snackbar>
        </View>
      </Portal>
      <StatusBar style="auto" />
    </>
  );
});

const App = observer(() => {
  // 首次启动时加载主题偏好
  useEffect(() => {
    themeStore.load();
    profileStore.load();
    // 注册微信AppID (替换为实际申请的AppID)
    registerApp({ 
      appid: 'wx174b5a4d92447b73', 
      universalLink: 'https://nongyu.app/' // iOS必需，Android可选
    }).catch(e => {
      console.warn('WeChat registerApp failed:', e);
    });
  }, []);

  if (!themeStore.ready || !profileStore.ready) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={themeStore.paperTheme}>
          <View style={styles['app__screen']}>
            <Text style={styles['app__text']}>加载中...</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={themeStore.paperTheme}>
        <AppContent />
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
  app__msgWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  app__msgError: {
    backgroundColor: '#d32f2f',
    borderRadius: 14,
  },
});
