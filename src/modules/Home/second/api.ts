import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, ToastAndroid } from 'react-native';
import { SECOND_CLASS_BASE_URL, SECOND_CLASS_TOKEN_KEY } from './constants';
import { profileStore } from '../../../stores/profile';

const api = axios.create({
  baseURL: SECOND_CLASS_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(SECOND_CLASS_TOKEN_KEY);
  if (token) {
    config.headers['x-access-token'] = token;
  }
  return config;
});

export const setSecondClassToken = async (token: string) => {
  await AsyncStorage.setItem(SECOND_CLASS_TOKEN_KEY, token);
};

export const setSecondClassCredentials = async (username: string, password: string) => {
  // 同时更新学号（username）和二课密码
  profileStore.setProfile({
    studentId: username,
    secondPwd: password,
  });
  await profileStore.save();
};

export const getSecondClassCredentials = async () => {
  // 确保 profileStore 已加载
  if (!profileStore.ready) {
    await profileStore.load();
  }
  return {
    username: profileStore.profile.studentId,
    password: profileStore.profile.secondPwd,
  };
};

export const getSecondClassToken = async () => {
  return await AsyncStorage.getItem(SECOND_CLASS_TOKEN_KEY);
};

export const clearSecondClassToken = async () => {
  await AsyncStorage.removeItem(SECOND_CLASS_TOKEN_KEY);
};

export const debugStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const result = await AsyncStorage.multiGet(keys);
    console.log('====== DEBUG STORAGE START ======');
    result.forEach(([key, value]) => {
      console.log(`Key: ${key}`);
      try {
        const jsonValue = JSON.parse(value || '{}');
        console.log(`Value (JSON):`, JSON.stringify(jsonValue, null, 2));
      } catch {
        console.log(`Value: ${value}`);
      }
      console.log('-------------------');
    });
    console.log('====== DEBUG STORAGE END ======');
  } catch (error) {
    console.error('Debug storage failed:', error);
  }
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: {token: string}) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      if (token) {
        prom.resolve({token});
      } else {
        prom.reject(new Error('Token is null'));
      }
    }
  });
  failedQueue = [];
};

const handleAutoLogin = async (originalRequest: any) => {
  // Avoid infinite loop if the failed request was the login request itself
  if (originalRequest.url && originalRequest.url.includes('/user/login/v1.0.0/snoLogin')) {
    return Promise.reject(new Error('Login request failed'));
  }

  if (isRefreshing) {
    return new Promise<{token: string}>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(({token}) => {
      originalRequest.headers['x-access-token'] = token;
      return axios(originalRequest);
    }).catch(err => {
      return Promise.reject(err);
    });
  }

  originalRequest._retry = true;
  isRefreshing = true;
  
  try {
    const { username, password } = await getSecondClassCredentials();
    
    if (username && password) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('二课登录过期，正在自动重新登录...', ToastAndroid.SHORT);
      } else {
        console.log('二课登录过期，正在自动重新登录...');
      }

      // Perform login using a fresh axios instance to avoid interceptors
      const loginRes = await axios.post(`${SECOND_CLASS_BASE_URL}/user/login/v1.0.0/snoLogin`, null, {
        params: {
          loginName: username,
          password: password,
          sid: 'f1c97a0e81c24e98adb1ebdadca0699b',
        },
      });

      const newToken = loginRes.headers['x-access-token'] || 
                       loginRes.data?.token || 
                       loginRes.data?.content?.token;

      if (newToken) {
        console.log('Auto login successful, new token:', newToken);
        await setSecondClassToken(newToken);
        
        // Process queue with new token
        processQueue(null, newToken);
        
        // Update the original request's token
        originalRequest.headers['x-access-token'] = newToken;
        
        // Retry the original request
        return axios(originalRequest);
      } else {
        throw new Error('No token in login response');
      }
    } else {
      throw new Error('No credentials found for auto-login');
    }
  } catch (loginError: any) {
    console.error('Auto login failed:', loginError);
    await debugStorage(); // 打印存储信息以供调试
    await clearSecondClassToken();
    if (Platform.OS === 'android') {
      ToastAndroid.show('自动重新登录失败，请手动登录', ToastAndroid.LONG);
    }
    processQueue(loginError, null);
    return Promise.reject(loginError);
  } finally {
    isRefreshing = false;
  }
};

api.interceptors.response.use(
  async (response) => {
    // Check for business logic error code indicating expiration
    // Specifically check for code: 5 and message: "用户过期"
    if (response.data && response.data.code === 5 && response.data.message === "用户过期") {
      try {
        return await handleAutoLogin(response.config);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401/403 error or the specific business error code in response data
    const isAuthError = 
      (error.response && (error.response.status === 401 || error.response.status === 403)) ||
      (error.response && error.response.data && error.response.data.code === 5 && error.response.data.message === "用户过期");

    if (isAuthError && !originalRequest._retry) {
      try {
        return await handleAutoLogin(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }
    
    // If not 401/403 or retry failed, reject
    return Promise.reject(error);
  }
);

export default api;
