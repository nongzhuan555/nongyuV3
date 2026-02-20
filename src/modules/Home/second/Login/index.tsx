import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api, { setSecondClassToken, clearSecondClassToken, setSecondClassCredentials, debugStorage } from '../api';

export default function SecondLogin() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    // 打印本地存储信息，方便调试
    debugStorage();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('提示', '请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      // Clear any existing token to ensure a fresh login attempt
      await clearSecondClassToken();

      // Documentation says params are in query string
      const response = await api.post('/user/login/v1.0.0/snoLogin', null, {
        params: {
          loginName: username,
          password: password,
          sid: 'f1c97a0e81c24e98adb1ebdadca0699b',
        },
      });

      console.log('Login response:', response);

      // Try to find token in headers or body
      // Note: Header keys are usually lowercased by axios
      const token = response.headers['x-access-token'] || 
                    response.data?.token || 
                    response.data?.content?.token;

      if (token) {
        console.log('Login successful, saving credentials');
        await setSecondClassToken(token);
        // Save credentials for auto-login
        await setSecondClassCredentials(username, password);

        // Navigate back or to the list
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // @ts-ignore
            navigation.replace('SecondHome');
        }
      } else {
        // If no token found, maybe the login failed logic is different?
        Alert.alert('登录失败', '未能获取到Token，请联系管理员或稍后重试');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || '未知错误';
      Alert.alert('登录失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{flex: 1, backgroundColor: theme.colors.background}}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <LinearGradient
            colors={[theme.colors.primaryContainer, theme.colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            locations={[0, 0.4]}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: 1, paddingTop: insets.top }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={styles.headerTopRow}>
                   <IconButton 
                     icon="close" 
                     size={24} 
                     onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('RootTabs')} 
                     style={styles.closeButton}
                   />
                </View>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="trophy-outline" size={48} color={theme.colors.primary} />
                </View>
                <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  二课系统登录
                </Text>
                <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.secondary }]}>
                  开启你的第二课堂之旅
                </Text>
              </View>
              
              <View style={styles.form}>
                <TextInput
                  label="学号"
                  value={username}
                  onChangeText={setUsername}
                  mode="outlined"
                  style={styles.input}
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="account-outline" color={theme.colors.primary} />}
                  theme={{ roundness: 12 }}
                />
                <TextInput
                  label="密码"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-outline" color={theme.colors.primary} />}
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"} 
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  theme={{ roundness: 12 }}
                />
                
                <Button 
                  mode="contained" 
                  onPress={handleLogin} 
                  loading={loading} 
                  disabled={loading}
                  style={styles.button}
                  contentStyle={{ height: 50 }}
                  labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                >
                  {loading ? '登录中...' : '立即登录'}
                </Button>
              </View>

              <View style={styles.tipsContainer}>
                <View style={styles.tipsHeader}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={theme.colors.onSurface} style={{ opacity: 0.8 }} />
                  <Text variant="labelMedium" style={[styles.tipsTitle, { color: theme.colors.onSurface, opacity: 0.9 }]}>温馨提示</Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant, opacity: 0.8 }]}>•</Text>
                  <Text variant="bodySmall" style={[styles.tipText, { color: theme.colors.onSurfaceVariant, opacity: 0.8 }]}>
                    农屿和i川农是两套独立的系统
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant, opacity: 0.8 }]}>•</Text>
                  <Text variant="bodySmall" style={[styles.tipText, { color: theme.colors.onSurfaceVariant, opacity: 0.8 }]}>
                    想在农屿上集成i川农的二课功能需要登录
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant, opacity: 0.8 }]}>•</Text>
                  <Text variant="bodySmall" style={[styles.tipText, { color: theme.colors.onSurfaceVariant, opacity: 0.8 }]}>
                    后续使用中若登录过期再重新登陆即可
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  headerTopRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  closeButton: {
    marginLeft: -10,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  form: {
    width: '100%',
    marginBottom: 40,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 16,
    borderRadius: 12,
  },
  tipsContainer: {
    padding: 20,
    borderRadius: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 16,
  },
  bullet: {
    marginRight: 8,
    fontWeight: 'bold',
  },
  tipText: {
    lineHeight: 20,
    flex: 1,
  },
});
