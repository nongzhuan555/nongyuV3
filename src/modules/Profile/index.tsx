import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, Animated, Easing, Alert, ScrollView, ImageBackground, Image } from 'react-native';
import { Button, IconButton, Snackbar, Portal, useTheme, Surface, Avatar, List, Divider, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import JiaowuLoginProbe from './components/JiaowuLoginProbe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileStore } from '@/stores/profile';
import { post, setHttpConfig, toHttpError } from '@/shared/http';
import { themeStore } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ShareSheet from '@/components/ShareSheet';
import analytics from '@/sdk/analytics';

const InfoCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => {
  const theme = useTheme();
  return (
    <Surface style={[styles.infoCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.onSecondaryContainer} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{value || '未知'}</Text>
      </View>
    </Surface>
  );
};

const Profile = observer(() => {
  const [logged, setLogged] = useState(false);
  const [msgVisible, setMsgVisible] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('error');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    Animated.timing(progress, {
      toValue: logged ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [logged]);

  useEffect(() => {
    setLogged(!!profileStore.profile?.studentId?.trim());
  }, [profileStore.profile?.studentId]);

  const loginOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const loginTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const mineOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const mineTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  const profile = profileStore.profile;
  const profileName = profile.name?.trim() || '未登录';
  const profileId = profile.studentId?.trim() || '点击登录';
  const avatarText = profileName.slice(0, 1);
  const avatarGradient = React.useMemo(() => {
    const seed = (profile.studentId || profile.name || 'nongyu').trim();
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const palettes: [string, string][] = [
      ['#FF9A9E', '#FECFEF'], // Soft Pink
      ['#a18cd1', '#fbc2eb'], // Lavender
      ['#84fab0', '#8fd3f4'], // Mint
      ['#e0c3fc', '#8ec5fc'], // Periwinkle
      ['#fccb90', '#d57eeb'], // Sunset
      ['#e0c3fc', '#8ec5fc'], // Soft Blue
      ['#f093fb', '#f5576c'], // Rose
      ['#4facfe', '#00f2fe'], // Ocean
    ];
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  }, [profile.studentId, profile.name]);

  const showMessage = (text: string, type: 'success' | 'error' = 'error') => {
    setMsgText(text);
    setMsgType(type);
    setMsgVisible(true);
  };

  const doLogout = async () => {
    if (logoutLoading) return;
    const token = profileStore.token?.trim();
    setLogoutLoading(true);
    try {
      // 尝试网络退出，但不阻塞本地清除
      if (token) {
        setHttpConfig({ token });
        try {
          await post('/logout', undefined, { headers: { Authorization: `Bearer ${token}`, token } });
        } catch (e) {
          console.warn('Network logout failed', e);
        }
      }
      
      await profileStore.clear();
      await themeStore.setMode('light');
      await themeStore.setBrand('default');
      
      // 清除其他残留数据
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter(key => 
          key === 'app:exam:cache' ||
          key === 'JIAOWU_COURSE_DATA' ||
          key === 'JIAOWU_CUSTOM_COURSE_DATA' ||
          key === 'SECOND_CLASS_TOKEN_KEY' ||
          key === 'app:jiaowu:asp_cookie' ||
          key.startsWith('weather:openmeteo:') ||
          key.startsWith('TODO_LIST_')
        );
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
      } catch (e) {
        console.warn('Failed to clear extra storage', e);
      }

      setHttpConfig({ token: '' });
      setLogged(false);
      
      // Update widget to empty
      try {
        const now = new Date();
        const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 周${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`;
        requestWidgetUpdate({
          widgetName: 'TodayCourse',
          renderWidget: () => <TodayCourseWidget courses={[]} dateStr={dateStr} />,
          widgetInfo: {
            widgetName: 'TodayCourse',
            width: 320,
            height: 120,
            minWidth: 320,
            minHeight: 120,
          }
        });
      } catch (e) {
        // ignore
      }

      showMessage('已退出登录', 'success');
    } catch (e) {
      const httpErr = toHttpError(e);
      showMessage(httpErr.message || '退出登录失败');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleLogout = () => {
    analytics.trackClick('logout_button', 'Profile', {
      element_name: '退出登录按钮',
      page_name: 'Profile',
    });
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？退出后将清除所有本地数据（包括课程、自定义日程、考试、成绩、待办等）。',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', style: 'destructive', onPress: doLogout },
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了';
    if (hour < 11) return '早上好';
    if (hour < 13) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const renderLoginView = () => (
    <Animated.View
      style={[
        styles.fullScreenLayer,
        {
          opacity: loginOpacity,
          transform: [{ translateY: loginTranslate }],
        }
      ]}
      pointerEvents={!logged ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.4]}
        style={styles.loginGradient}
      >
        <View style={[styles.loginContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.welcomeHeader}>
            <View style={[styles.logoContainer, { backgroundColor: 'transparent' }]}>
              <Image 
                source={require('../../../assets/icon.png')} 
                style={{ width: '100%', height: '100%', borderRadius: 18 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.greetingText, { color: theme.colors.onSurfaceVariant }]}>{getGreeting()}</Text>
            <Text style={[styles.loginTitle, { color: theme.colors.onSurface }]}>欢迎来到农屿</Text>
            <Text style={[styles.loginSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              请使用教务网登录，开启农屿之旅
            </Text>
          </View>
          <JiaowuLoginProbe onSuccess={() => setLogged(true)} />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProfileView = () => (
    <Animated.View
      style={[
        styles.fullScreenLayer,
        {
          opacity: mineOpacity,
          transform: [{ translateY: mineTranslate }],
        }
      ]}
      pointerEvents={logged ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        style={styles.pageGradient}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Area */}
          <View style={[styles.headerArea, { marginTop: insets.top + 12 }]}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>我的</Text>
              <IconButton 
                icon="cog-outline" 
                size={24} 
                onPress={() => navigation.navigate('ProfileSetting' as never)} 
                style={styles.headerSettingBtn}
              />
            </View>
            
            <Surface style={styles.idCard} elevation={4}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.tertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.idCardGradient}
              >
                <View style={styles.idCardContent}>
                  <View style={styles.avatarWrapper}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.3)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avatarGradientBorder}
                    >
                      <LinearGradient
                        colors={avatarGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatarInner}
                      >
                        <Text style={[styles.avatarText, { color: '#fff', textShadowColor: 'rgba(0,0,0,0.1)', textShadowRadius: 4 }]}>
                          {avatarText}
                        </Text>
                      </LinearGradient>
                    </LinearGradient>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.userName}>{profileName}</Text>
                    <View style={styles.studentIdTag}>
                      <Text style={[styles.studentIdText, { color: theme.colors.primary }]}>{profileId}</Text>
                    </View>
                  </View>
                </View>
                {/* Decorative Elements */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
              </LinearGradient>
            </Surface>
          </View>
  
          {/* Info Grid */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>基本信息</Text>
          <View style={styles.gridContainer}>
            <InfoCard label="学院" value={profile.college} icon="domain" />
            <InfoCard label="专业" value={profile.major} icon="school-outline" />
            <InfoCard label="班级" value={profile.className} icon="account-group-outline" />
            <InfoCard label="年级" value={profile.grade} icon="calendar-clock-outline" />
            <InfoCard label="校区" value={profile.campus} icon="map-marker-outline" />
            <InfoCard label="生源地" value={profile.origin} icon="home-outline" />
          </View>
        </View>

        {/* Actions List */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>更多服务</Text>
          <Surface style={[styles.listContainer, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <List.Item
              title="分享农屿"
              description="推荐给你的同学、朋友和室友吧"
              left={props => <List.Icon {...props} icon="share-variant-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                analytics.trackClick('share_button', 'Profile', {
                  element_name: '分享农屿',
                  page_name: 'Profile',
                });
                setShareVisible(true);
              }}
            />
            <Divider />
            <List.Item
              title="关于农屿"
              description="了解更多关于农屿的信息"
              left={props => <List.Icon {...props} icon="information-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                analytics.trackClick('about_button', 'Profile', {
                  element_name: '关于农屿',
                  page_name: 'Profile',
                });
                const url = 'https://nongyu-app.github.io/index.html';
                if (profileStore.webOpenMode === 'external') {
                  // @ts-ignore
                  // 外部浏览器打开
                  require('react-native').Linking.openURL(url).catch(() => {});
                } else {
                  // @ts-ignore
                  navigation.navigate('WebViewScreen', { url, title: '关于农屿' });
                }
              }}
            />
          </Surface>
        </View>

        <View style={styles.logoutContainer}>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutBtn}
              textColor={theme.colors.error}
              loading={logoutLoading}
            >
              退出登录
            </Button>
          </View>
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderLoginView()}
      {renderProfileView()}
      
      <ShareSheet visible={shareVisible} onDismiss={() => setShareVisible(false)} />

      <Portal>
        <Snackbar
          visible={msgVisible}
          onDismiss={() => setMsgVisible(false)}
          duration={2000}
          action={{ label: '关闭', onPress: () => setMsgVisible(false) }}
          style={{ backgroundColor: msgType === 'error' ? theme.colors.error : theme.colors.inverseSurface }}
        >
          {msgText}
        </Snackbar>
      </Portal>

      {logoutLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.backdrop }]}>
          <ActivityIndicator size="large" color={theme.colors.surface} />
          <Text style={[styles.loadingText, { color: theme.colors.surface }]}>正在退出...</Text>
        </View>
      )}
    </View>
  );
});

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  fullScreenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  loginGradient: {
    flex: 1,
    justifyContent: 'center',
  },
  loginContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  welcomeHeader: {
    marginBottom: 56,
    paddingHorizontal: 4,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  loginTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.6,
    maxWidth: '90%',
  },
  headerArea: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSettingBtn: {
    margin: 0,
  },
  idCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  idCardGradient: {
    position: 'relative',
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
  },
  idCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarGradientBorder: {
    padding: 3,
    borderRadius: 40,
  },
  avatarInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    marginLeft: 20,
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  studentIdTag: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  studentIdText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -40,
    right: -20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: -10,
  },
  sectionContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    width: '48%', // roughly half width with gap
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutContainer: {
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 32,
  },
  logoutBtn: {
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  pageGradient: {
    flex: 1,
  },
});
