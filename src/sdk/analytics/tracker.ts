import { AppState, AppStateStatus, Platform } from 'react-native';
import { AnalyticsEvent, AnalyticsConfig, EventType, EventProperties } from './types';
import { AnalyticsStorage } from './storage';
import { AnalyticsNetwork } from './network';
import { generateUUID, formatDate, formatDayDate, getDeviceInfo } from './utils';

const DEFAULT_CONFIG: Partial<AnalyticsConfig> = {
  batchSize: 10,
  flushInterval: 10000, // 10s
  maxRetries: 3,
  storagePrefix: 'analytics_sdk_',
  debug: false,
};

export class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private config: AnalyticsConfig;
  private storage: AnalyticsStorage;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private userId: string | number = 0;
  private deviceInfo: string = '';
  private sessionEvents: Set<string> = new Set();

  private constructor() {
    this.config = {
      endpoint: '',
      ...DEFAULT_CONFIG,
    };
    this.storage = new AnalyticsStorage(this.config.storagePrefix);
    this.deviceInfo = getDeviceInfo();
    
    // Auto load queue on init
    this.loadQueue();

    // Listen to app state changes for auto flush on background
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  public static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  /**
   * Initialize the SDK with configuration
   */
  public init(config: AnalyticsConfig) {
    this.config = {
      ...this.config,
      ...config,
    };
    this.storage = new AnalyticsStorage(this.config.storagePrefix);
    
    if (this.config.debug) {
      console.log('[AnalyticsSDK] Initialized with config:', this.config);
    }

    this.startFlushTimer();
  }

  /**
   * Set the current logged-in user ID
   */
  public setUserId(userId: string | number) {
    this.userId = userId;
  }

  /**
   * Track a custom event
   */
  public track(
    eventType: EventType,
    properties: EventProperties = {},
    pageName?: string,
    elementName?: string,
    durationMs?: number
  ) {
    const now = new Date();
    // 优先使用 properties 中的 page_name 和 element_name，如果没传则使用参数中的，如果还没传则为空
    const finalPageName = properties.page_name || pageName || '';
    const finalElementName = properties.element_name || elementName || '';

    // 生成去重键：event_type + page_name + element_name (如果是点击事件)
    // 对于 page_view，key 是 event_type + page_name
    // 对于 client_performance，只关心 page_name
    let dedupeKey = '';
    if (eventType === 'user_enter_page') {
      dedupeKey = `${eventType}_${finalPageName}`;
    } else if (eventType === 'user_click_button') {
      dedupeKey = `${eventType}_${finalPageName}_${finalElementName}`;
    } else if (eventType === 'client_performance') {
      // 性能数据不去重，或者根据需求去重。用户说“关心某个功能/页面是否被大量用户使用”，
      // 但性能数据通常需要多次采集取平均值。不过用户说“不要同样的事件采集多次”，
      // 且“只关心课表渲染的性能”。如果用户每天只看一次课表性能，那也可以去重。
      // 这里为了安全起见，对性能数据也进行会话级去重，避免单次会话重复上报。
      dedupeKey = `${eventType}_${finalPageName}`;
    }

    // 如果已经上报过，则忽略
    if (dedupeKey && this.sessionEvents.has(dedupeKey)) {
      if (this.config.debug) {
        console.log('[AnalyticsSDK] Event skipped (duplicate):', dedupeKey);
      }
      return;
    }

    // 记录到已上报集合
    if (dedupeKey) {
      this.sessionEvents.add(dedupeKey);
    }

    const event: AnalyticsEvent = {
      event_uuid: generateUUID(),
      event_type: eventType,
      event_time: formatDate(now),
      day_date: formatDayDate(now),
      user_id: this.userId,
      device_info: this.deviceInfo,
      page_name: finalPageName,
      element_name: finalElementName,
      duration_ms: durationMs || 0,
      properties: properties,
    };

    // 如果是 page_view 事件，确保 properties 中也有 page_name
    if (eventType === 'user_enter_page' && !properties.page_name) {
      properties.page_name = finalPageName;
    }
    
    // 如果是 click 事件，确保 properties 中也有 element_name 和 page_name
    if (eventType === 'user_click_button') {
      if (!properties.element_name) properties.element_name = finalElementName;
      if (!properties.page_name) properties.page_name = finalPageName;
    }

    this.queue.push(event);
    this.saveQueue();

    if (this.config.debug) {
      console.log('[AnalyticsSDK] Tracked event:', event);
    }

    // Check if we need to flush immediately
    if (this.queue.length >= (this.config.batchSize || 10)) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  public trackPageView(pageName: string, properties: EventProperties = {}) {
    this.track('user_enter_page', properties, pageName);
  }

  /**
   * Track button click
   */
  public trackClick(elementName: string, pageName?: string, properties: EventProperties = {}) {
    this.track('user_click_button', properties, pageName, elementName);
  }

  /**
   * Track app launch
   */
  public trackAppLaunch(properties: EventProperties = {}) {
    this.track('user_enter_app', properties);
  }

  /**
   * Track page load performance
   */
  public trackPageLoad(pageName: string, durationMs: number, properties: EventProperties = {}) {
    this.track('page_load_time', properties, pageName, '', durationMs);
  }

  /**
   * Force flush the queue
   */
  public async flush() {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    if (!this.config.endpoint) {
      if (this.config.debug) {
        console.warn('[AnalyticsSDK] Endpoint not configured, skipping flush');
      }
      return;
    }

    this.isFlushing = true;

    // Take a batch of events
    const batchSize = this.config.batchSize || 10;
    const eventsToUpload = this.queue.slice(0, batchSize);
    
    if (this.config.debug) {
      console.log(`[AnalyticsSDK] Flushing ${eventsToUpload.length} events...`);
    }

    try {
      const success = await AnalyticsNetwork.upload(eventsToUpload, this.config);

      if (success) {
        // Remove uploaded events from queue
        this.queue = this.queue.slice(eventsToUpload.length);
        this.saveQueue();
        
        if (this.config.debug) {
          console.log(`[AnalyticsSDK] Flush success. Remaining events: ${this.queue.length}`);
        }

        // If there are more events, flush again immediately
        if (this.queue.length >= batchSize) {
          setTimeout(() => {
            this.isFlushing = false;
            this.flush();
          }, 100);
          return; // Don't reset flag yet
        }
      } else {
        // Failed, keep events in queue
        // We might want to implement exponential backoff here, but for now just wait for next interval
        if (this.config.debug) {
          console.warn('[AnalyticsSDK] Flush failed, events kept in queue');
        }
      }
    } catch (e) {
      console.error('[AnalyticsSDK] Flush error:', e);
    } finally {
      this.isFlushing = false;
    }
  }

  private async loadQueue() {
    const savedQueue = await this.storage.loadQueue();
    if (savedQueue && savedQueue.length > 0) {
      this.queue = [...savedQueue, ...this.queue];
      if (this.config.debug) {
        console.log(`[AnalyticsSDK] Loaded ${savedQueue.length} events from storage`);
      }
    }
  }

  private saveQueue() {
    // Debounce save or just save every time? 
    // For safety, save every time for now, but in high load this might be slow.
    // Optimization: Save only when app goes to background or periodically.
    // For this implementation, I'll rely on handleAppStateChange for critical saves, 
    // and maybe save periodically. 
    // But to be safe against crashes, saving on every track is better if queue is small.
    // Let's save on every track for now as it's safer.
    this.storage.saveQueue(this.queue);
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval || 10000);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.saveQueue();
      this.flush();
    } else if (nextAppState === 'active') {
      this.startFlushTimer();
      // Track app enter (resume) if needed, but usually 'user_enter_app' is for cold start.
      // We can add logic to track foregrounding as 'user_enter_app' if we want session-based tracking.
      // For now, I'll leave it to the user to call trackAppLaunch().
    }
  };
}
