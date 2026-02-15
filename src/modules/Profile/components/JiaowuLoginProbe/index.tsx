import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Button, Text, TextInput, ActivityIndicator, Snackbar, useTheme, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginJiaoWu, loginJiaoWuRaw } from '@/jiaowu/login/login';

type Props = {
  onSuccess?: () => void;
  suppressSuccessNavigate?: boolean;
};

export default function JiaowuLoginProbe({ onSuccess, suppressSuccessNavigate }: Props) {
  const theme = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(16)).current;
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgVisible, setMsgVisible] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [topMsgVisible, setTopMsgVisible] = useState(false);
  const [topMsgText, setTopMsgText] = useState('');
  const topFade = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(-20)).current;
  const [idError, setIdError] = useState<string | null>(null);
  const [rawStatus, setRawStatus] = useState<number | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(offsetY, { toValue: 0, duration: 260, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  const validId = (v: string) => /^\d{9}$/.test(v);
  const canSubmit = validId(user) && pwd.length > 0 && !loading;

  const showTopMessage = (text: string) => {
    setTopMsgText(text);
    setTopMsgVisible(true);
    topFade.setValue(0);
    topY.setValue(-12);
    Animated.parallel([
      Animated.timing(topFade, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(topY, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(topFade, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(topY, { toValue: -12, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ]).start(() => setTopMsgVisible(false));
    }, 9000);
  };

  const onSubmit = async () => {
    if (!validId(user)) {
      setIdError('学号需为9位数字');
      showTopMessage('学号需为9位数字');
      return;
    }
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const raw = await loginJiaoWuRaw(user, pwd);
      setRawStatus(raw?.status ?? null);
      const bodyText = typeof raw?.data === 'string' ? raw.data : JSON.stringify(raw?.data, null, 2);
      const head = (bodyText || '').trimStart().toLowerCase();
      const failed = head.startsWith('<script language=javascript');
      const passed = !failed;
      setOk(!!passed);
      if (passed) {
        setMsgText('验证通过');
        setMsgVisible(true);
        if (!suppressSuccessNavigate) {
          onSuccess?.();
        }
      } else {
        showTopMessage('教务密码输错啦，今天错误次数超过5次会被系统锁定哦~是不是已经收到短信验证码了呀');
      }
    } catch (e: any) {
      setError(e?.message || '请求失败');
      showTopMessage('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Portal>
        {topMsgVisible ? (
          <Animated.View
            style={[
              styles.topMsg,
              {
                opacity: topFade,
                transform: [{ translateY: topY }],
                backgroundColor: theme.dark ? '#0b2b2a' : '#e8f5f5',
                borderColor: theme.dark ? '#1f5c5a' : '#b2dfdb',
                top: (insets?.top ?? 0) + 24,
              },
            ]}
          >
            <Text style={[styles.topMsgText, { color: theme.dark ? '#cde7e6' : '#0e4a47' }]}>{topMsgText}</Text>
          </Animated.View>
        ) : null}
      </Portal>
      <Animated.View
        style={[
          styles.wrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            opacity: fade,
            transform: [{ translateY: offsetY }],
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>使用川农教务系统登录</Text>
        <TextInput
          label="学号"
          mode="outlined"
          value={user}
          onChangeText={(v) => {
            setUser(v);
            if (v.length === 0 || validId(v)) setIdError(null);
            else setIdError('学号需为9位数字');
          }}
          style={styles.input}
          autoCapitalize="none"
          error={!!idError}
          outlineStyle={styles.outline}
        />
        {!!idError ? <Text style={styles.errTip}>{idError}</Text> : null}
        <TextInput
          label="密码"
          mode="outlined"
          value={pwd}
          onChangeText={setPwd}
          style={styles.input}
          secureTextEntry={!showPwd}
          right={
            <TextInput.Icon
              icon={showPwd ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPwd((v) => !v)}
              forceTextInputFocus={false}
            />
          }
          outlineStyle={styles.outline}
        />
        <Button mode="contained" onPress={onSubmit} disabled={!canSubmit} style={styles.btn}>
          进入农屿
        </Button>

        <View style={styles.result}>
          {loading ? <ActivityIndicator /> : null}
          {!loading && error ? <Text style={styles.err}>{error}</Text> : null}
          {/* 移除状态码文案显示 */}
          {/* 已按要求隐藏响应报文 */}
        </View>
        <Snackbar
          visible={msgVisible}
          onDismiss={() => setMsgVisible(false)}
          duration={2600}
          style={{ backgroundColor: ok ? theme.colors.primary : '#d32f2f' }}
        >
          {msgText}
        </Snackbar>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '92%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  topMsg: {
    position: 'absolute',
    top: 28,
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
    zIndex: 1000,
  },
  topMsgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    marginBottom: 10,
  },
  errTip: {
    color: '#d00',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 6,
  },
  btn: {
    marginTop: 2,
    borderRadius: 10,
  },
  result: {
    marginTop: 10,
    minHeight: 20,
  },
  text: {
    fontSize: 12,
  },
  outline: {
    borderRadius: 12,
  },
  err: {
    color: '#d00',
  },
});
