import { http } from '@/shared/http';

export interface Notification {
  id: number;
  title: string;
  content: string;
  type: number; // 1=系统更新, 2=系统维护, 3=安全通知, 4=日常通知
  status: number;
  created_at: string;
  publisher_name: string;
}

export interface NotificationListResponse {
  status: string;
  data: {
    list: Notification[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface NotificationDetailResponse {
  status: string;
  data: Notification;
}

/**
 * 获取最新通知
 */
export async function getLatestNotification(): Promise<Notification | null> {
  try {
    const res = await http.get<NotificationDetailResponse>('/admin/notifications', {
      params: { latest: true },
    });
    // Check if response is valid
    if (res.data?.status === 'ok' && res.data.data) {
      return res.data.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return null;
  }
}

/**
 * 获取通知列表
 */
export async function getNotificationList(page = 1, pageSize = 10): Promise<NotificationListResponse['data'] | null> {
  try {
    const res = await http.get<NotificationListResponse>('/admin/notifications', {
      params: { page, pageSize },
    });
    if (res.data?.status === 'ok' && res.data.data) {
      return res.data.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch notification list:', error);
    return null;
  }
}
