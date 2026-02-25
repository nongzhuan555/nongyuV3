import { AnalyticsTracker } from './tracker';
import { AnalyticsConfig, AnalyticsEvent, EventProperties, EventType } from './types';

const analytics = AnalyticsTracker.getInstance();

export default analytics;

export {
  AnalyticsTracker,
  AnalyticsConfig,
  AnalyticsEvent,
  EventProperties,
  EventType,
};

// React Hook for easier usage
export const useAnalytics = () => {
  return analytics;
};
