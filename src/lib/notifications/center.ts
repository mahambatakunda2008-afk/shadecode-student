import type { NotificationItem, NotificationPreferences, NotificationType } from './types';
import { isNotificationEnabled } from './types';

export function filterNotifications(items: NotificationItem[], preferences: NotificationPreferences): NotificationItem[] {
  return items.filter(item => isNotificationEnabled(item.type, preferences));
}

export function unreadCount(items: NotificationItem[], preferences: NotificationPreferences): number {
  return filterNotifications(items, preferences).filter(item => !item.readAt).length;
}

export function groupNotifications(items: NotificationItem[]): Record<NotificationType, NotificationItem[]> {
  return items.reduce((groups, item) => {
    (groups[item.type] ??= []).push(item);
    return groups;
  }, {} as Record<NotificationType, NotificationItem[]>);
}

export function notificationHref(item: NotificationItem): string | null {
  if (!item.href || !item.href.startsWith('/')) return null;
  return item.href;
}
