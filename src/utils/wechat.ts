import { Alert } from 'react-native';

// 定义接口以获得类型提示（可选）
interface WeChatAPI {
  registerApp: (config: { appid: string; universalLink?: string }) => Promise<boolean>;
  isWechatInstalled: () => Promise<boolean>;
  shareWebpage: (options: any) => Promise<any>;
  shareText: (options: any) => Promise<any>;
  shareImage: (options: any) => Promise<any>;
  shareMiniProgram: (options: any) => Promise<any>;
  [key: string]: any;
}

let WeChat: WeChatAPI | null = null;

try {
  // 尝试同步加载模块
  // 在 React Native (Metro) 中，require 是同步的
  // 如果 expo-native-wechat 内部调用 requireNativeModule 失败，这里会抛出异常
  WeChat = require('expo-native-wechat');
} catch (error) {
  // 仅在开发环境下记录日志，避免生产环境干扰
  if (__DEV__) {
    console.log('[WeChat] Native module not loaded. This is expected in Expo Go. Use Development Build to test.', error);
  }
}

export const isNativeModuleAvailable = async () => {
  return !!WeChat;
};

export const registerApp = async (config: { appid: string; universalLink?: string }) => {
  if (WeChat && WeChat.registerApp) {
    return WeChat.registerApp(config);
  }
  return false;
};

export const isWechatInstalled = async () => {
  if (WeChat && WeChat.isWechatInstalled) {
    try {
      return await WeChat.isWechatInstalled();
    } catch (e) {
      console.warn('[WeChat] isWechatInstalled error:', e);
      return false;
    }
  }
  return false;
};

export const shareWebpage = async (options: any) => {
  if (WeChat && WeChat.shareWebpage) {
    return await WeChat.shareWebpage(options);
  }
  Alert.alert('提示', '微信分享模块未加载，请确保已构建原生应用');
  return { errCode: -1 };
};

export const shareText = async (options: any) => {
  if (WeChat && WeChat.shareText) {
    return await WeChat.shareText(options);
  }
  return { errCode: -1 };
};

export const shareImage = async (options: any) => {
  if (WeChat && WeChat.shareImage) {
    return await WeChat.shareImage(options);
  }
  return { errCode: -1 };
};

export const shareMiniProgram = async (options: any) => {
  if (WeChat && WeChat.shareMiniProgram) {
    return await WeChat.shareMiniProgram(options);
  }
  return { errCode: -1 };
};
