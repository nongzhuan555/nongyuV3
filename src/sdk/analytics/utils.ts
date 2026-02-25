import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Generate a UUID v4
 * Note: If crypto.randomUUID is not available, use a fallback
 */
export const generateUUID = (): string => {
  // @ts-ignore
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Format Date to YYYY-MM-DD HH:mm:ss
 */
export const formatDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format Date to YYYY-MM-DD
 */
export const formatDayDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  
  return `${year}-${month}-${day}`;
};

/**
 * Get basic device info
 */
export const getDeviceInfo = (): string => {
  const os = Platform.OS;
  const version = Platform.Version;
  
  const brand = Device.brand || 'unknown';
  const modelName = Device.modelName || 'unknown';
  const osName = Device.osName || os;
  const osVersion = Device.osVersion || version;

  return `${brand} ${modelName} (${osName} ${osVersion})`;
};
