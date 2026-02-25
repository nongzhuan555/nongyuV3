export interface EventProperties {
  [key: string]: any;
}

export interface AnalyticsEvent {
  event_uuid: string;
  event_type: string;
  event_time: string; // YYYY-MM-DD HH:mm:ss
  day_date: string; // YYYY-MM-DD
  user_id: string | number;
  device_info: string;
  page_name?: string;
  element_name?: string;
  duration_ms?: number;
  properties?: EventProperties;
}

export interface AnalyticsConfig {
  /** Backend API endpoint */
  endpoint: string;
  /** Authorization token (optional) */
  token?: string;
  /** Max events per batch (default: 10) */
  batchSize?: number;
  /** Auto flush interval in ms (default: 10000) */
  flushInterval?: number;
  /** Max retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Storage key prefix (default: 'analytics_sdk_') */
  storagePrefix?: string;
  /** Debug mode (default: false) */
  debug?: boolean;
}

export type EventType = 
  | 'user_enter_app'
  | 'user_enter_page'
  | 'user_click_button'
  | 'page_load_time'
  | string;
