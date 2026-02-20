import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { Button, Text, TextInput, ActivityIndicator, Snackbar, useTheme, Portal, Dialog } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPersonInfoFromJiaowu, loginJiaoWu } from '@/jiaowu/login/login';
import { post, setHttpConfig, toHttpError } from '@/shared/http';
import { profileStore } from '@/stores/profile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [statusText, setStatusText] = useState('请登录教务系统');
  const [logs, setLogs] = useState<string[]>([]);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);

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

  const pickFirst = (obj: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v && String(v).trim()) return String(v).trim();
    }
    return '';
  };

  const pickText = (value: unknown) => {
    if (value && String(value).trim()) return String(value).trim();
    return '';
  };

  const buildLoginPayload = (fields: Record<string, unknown>, raw: Record<string, unknown>) => {
    const studentNo = pickText(fields.studentId) || pickFirst(raw, ['学号', '学籍号', '学生号']) || user;
    const name = pickText(fields.name) || pickFirst(raw, ['姓名', '名字']);
    const className = pickFirst(raw, ['班级', '行政班', '班级名称']);
    const majorName = pickText(fields.major) || pickFirst(raw, ['专业', '专业名称']);
    const collegeName = pickText(fields.college) || pickFirst(raw, ['学院', '院系', '所属学院']);
    const campusName = pickText(fields.campus) || pickFirst(raw, ['校区', '所在校区']);
    const gender = pickFirst(raw, ['性别']);
    const origin = pickFirst(raw, ['生源地', '籍贯', '户籍']);
    const qq = pickFirst(raw, ['QQ', 'qq', 'Qq']);
    return {
      student_no: studentNo,
      name: name || '',
      class_name: className || '',
      major_name: majorName || '',
      college_name: collegeName || '',
      campus_name: campusName || '',
      gender: gender || '',
      origin_place: origin || '',
      qq: qq || '',
      role_code: 1,
      current_token_id: null,
      status: 1,
    };
  };

  const addLog = (msg: string, data?: unknown) => {
    const time = new Date().toLocaleTimeString();
    const line = data ? `[${time}] ${msg}\n${JSON.stringify(data, null, 2)}` : `[${time}] ${msg}`;
    setLogs((prev) => [line, ...prev]);
  };

  const checkAndClearCourseData = async () => {
    try {
      const courseData = await AsyncStorage.getItem('JIAOWU_COURSE_DATA');
      const customCourseData = await AsyncStorage.getItem('JIAOWU_CUSTOM_COURSE_DATA');
      
      if (courseData || customCourseData) {
        setClearDialogVisible(true);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Check course data failed', e);
      return true;
    }
  };

  const handleClearConfirm = async () => {
    try {
      await AsyncStorage.removeItem('JIAOWU_COURSE_DATA');
      await AsyncStorage.removeItem('JIAOWU_CUSTOM_COURSE_DATA');
      setClearDialogVisible(false);
      if (pendingLogin) {
        setPendingLogin(false);
        performLogin();
      }
    } catch (e) {
      console.error('Clear course data failed', e);
    }
  };

  const handleClearCancel = () => {
    setClearDialogVisible(false);
    setPendingLogin(false);
    // 用户取消清除，依然继续登录流程，或者根据需求中止
    performLogin();
  };

  const onSubmit = async () => {
    if (!validId(user)) {
      setIdError('学号需为9位数字');
      showTopMessage('学号需为9位数字');
      return;
    }
    
    setPendingLogin(true);
    const shouldProceed = await checkAndClearCourseData();
    if (shouldProceed) {
      performLogin();
    }
  };

  const performLogin = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    setStatusText('正在验证教务账号...');
    let isNongyuLogin = false;
    try {
      const loginResp = await loginJiaoWu(user, pwd);
      const passed = !!loginResp?.passed;
      setOk(passed);
      if (!passed) {
        showTopMessage('教务密码输错啦，今天错误次数超过5次会被系统锁定哦~是不是已经收到短信验证码了呀');
        setError('教务验证失败');
        return;
      }
      setStatusText('正在获取个人信息...');
      const personInfo = await getPersonInfoFromJiaowu(loginResp?.cookies || []);
      const fields = (personInfo?.fields || {}) as Record<string, unknown>;
      const raw = (personInfo?.raw || {}) as Record<string, unknown>;
      addLog('清洗后的个人信息JSON', { fields, raw });
      const payload = buildLoginPayload(fields, raw);
      if (!payload.student_no) {
        throw new Error('未获取到学号');
      }
      setStatusText('正在登录农屿...');
      addLog('开始登录农屿后台', payload);
      isNongyuLogin = true;
      const resp = await post('/login', payload);
      const data = (resp?.data ?? {}) as Record<string, unknown>;
      const inner = (data.data ?? {}) as Record<string, unknown>;
      addLog('农屿登录响应', data);
      const token =
        pickText(data.token) ||
        pickText(inner.token) ||
        pickText(data.access_token) ||
        pickText(inner.access_token) ||
        pickText(data.current_token_id);
      if (token) {
        profileStore.setToken(token);
        setHttpConfig({ token });
      }
      profileStore.setProfile({
        name: payload.name || pickText(fields.name) || '',
        studentId: payload.student_no,
        qq: payload.qq || '',
        className: payload.class_name || '',
        grade: pickText(fields.grade) || '',
        college: payload.college_name || '',
        major: payload.major_name || '',
        campus: payload.campus_name || '',
        gender: payload.gender || '',
        origin: payload.origin_place || '',
        password: pwd,
      });
      await profileStore.save();
      const persistedProfile = await profileStore.getPersistedProfile();
      console.log('本地持久化个人信息', persistedProfile);
      setOk(true);
      setMsgText('登录成功');
      setMsgVisible(true);
      if (!suppressSuccessNavigate) {
        onSuccess?.();
      }
    } catch (e) {
      const httpErr = toHttpError(e);
      setOk(false);
      setError(httpErr.message || '请求失败');
      addLog('请求错误', { message: httpErr.message, status: httpErr.status, data: httpErr.data });
      if (httpErr.status === 409) {
        showTopMessage('学号已存在，请直接登录或联系管理员');
      } else if (isNongyuLogin) {
        showTopMessage('初次登录可能不稳定，请再次尝试~');
      } else if (httpErr.status === 500) {
        showTopMessage('服务器异常，请稍后重试');
      } else {
        showTopMessage(httpErr.message || '请求失败，请稍后重试');
      }
    } finally {
      setLoading(false);
      setStatusText('');
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
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
                top: (insets?.top ?? 0) + 120,
              },
            ]}
          >
            <Text style={[styles.topMsgText, { color: theme.colors.onSurfaceVariant }]}>{topMsgText}</Text>
          </Animated.View>
        ) : null}
        <Dialog visible={clearDialogVisible} onDismiss={handleClearCancel}>
          <Dialog.Title>清空旧课表数据</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">检测到本地已存储了课程表数据，重新登录将清空旧数据，是否确认？</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleClearCancel}>取消</Button>
            <Button onPress={handleClearConfirm}>确认清空</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Animated.View
        style={[
          styles.wrap,
          {
            opacity: fade,
            transform: [{ translateY: offsetY }],
          },
        ]}
      >
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
          theme={{ roundness: 16 }}
        />
        {!!idError ? <Text style={[styles.errTip, { color: theme.colors.error }]}>{idError}</Text> : null}
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
          theme={{ roundness: 16 }}
        />
        <Button 
          mode="contained" 
          onPress={onSubmit} 
          disabled={!canSubmit} 
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          进入农屿
        </Button>

        <View style={styles.result}>
          {loading ? <ActivityIndicator /> : null}
          {!!statusText ? <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>{statusText}</Text> : null}
          {!loading && error ? <Text style={[styles.err, { color: theme.colors.error }]}>{error}</Text> : null}
        </View>

        <View style={styles.tipsContainer}>
           <MaterialCommunityIcons name="shield-check-outline" size={18} color={theme.colors.onSurfaceVariant} style={[styles.tipsIcon, { opacity: 0.5 }]} />
           <Text style={[styles.tipsText, { color: theme.colors.onSurfaceVariant }]}>
             农屿承诺不会在云端存储您的密码信息，但为了功能需要，会将密码等数据存储在客户端本地
           </Text>
        </View>

        {ok ? (
          <Portal>
            <View style={[styles['login__msgWrap'], { top: (insets?.top ?? 0) + 120 }]}>
              <Snackbar
                visible={msgVisible}
                onDismiss={() => setMsgVisible(false)}
                duration={2200}
                style={[styles['login__msgSuccess'], { backgroundColor: theme.colors.primary }]}
              >
                {msgText}
              </Snackbar>
            </View>
          </Portal>
        ) : (
          <Snackbar
            visible={msgVisible}
            onDismiss={() => setMsgVisible(false)}
            duration={2600}
            style={{ backgroundColor: theme.colors.error }}
          >
            {msgText}
          </Snackbar>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
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
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  errTip: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  btn: {
    marginTop: 8,
    borderRadius: 30,
  },
  btnContent: {
    height: 52,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  result: {
    marginTop: 16,
    minHeight: 20,
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    marginTop: 8,
  },
  outline: {
    borderRadius: 16,
  },
  err: {
    fontSize: 13,
    marginTop: 8,
  },
  login__msgWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  login__msgSuccess: {
    borderRadius: 14,
  },
  tipsContainer: {
    flexDirection: 'row',
    marginTop: 32,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  tipsIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.5,
  },
});
