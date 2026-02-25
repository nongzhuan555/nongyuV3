import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsEvent } from './types';

const DEFAULT_KEY = 'analytics_sdk_queue';

export class AnalyticsStorage {
  private key: string;

  constructor(keyPrefix: string = 'analytics_sdk_') {
    this.key = `${keyPrefix}queue`;
  }

  async loadQueue(): Promise<AnalyticsEvent[]> {
    try {
      const data = await AsyncStorage.getItem(this.key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[AnalyticsSDK] Failed to load queue:', e);
    }
    return [];
  }

  async saveQueue(queue: AnalyticsEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.key, JSON.stringify(queue));
    } catch (e) {
      console.error('[AnalyticsSDK] Failed to save queue:', e);
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.key);
    } catch (e) {
      console.error('[AnalyticsSDK] Failed to clear queue:', e);
    }
  }
}
