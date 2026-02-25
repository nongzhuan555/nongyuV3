import axios from 'axios';
import { AnalyticsEvent, AnalyticsConfig } from './types';

export class AnalyticsNetwork {
  static async upload(
    events: AnalyticsEvent[],
    config: AnalyticsConfig
  ): Promise<boolean> {
    if (!events.length) return true;

    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
 
      // 创建独立的 axios 实例
      const instance = axios.create({
        timeout: 10000,
        headers,
      });

      const response = await instance.post(
        config.endpoint,
        {
          events,
        }
      );

      if (response.status === 200) {
        if (config.debug) {
          console.log('[AnalyticsSDK] Upload success:', response.data);
        }
        return true;
      } else {
        if (config.debug) {
          console.error('[AnalyticsSDK] Upload failed:', response.status, response.data);
        }
        return false;
      }
    } catch (error: any) {
      if (config.debug) {
        console.error('[AnalyticsSDK] Network error:', error);
      }
      return false;
    }
  }
}
