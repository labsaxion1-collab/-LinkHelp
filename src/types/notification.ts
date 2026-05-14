export type NotificationType = 'system' | 'message' | 'application' | 'job_update' | 'payment';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: number;
}
