export type NotificationType = 'study_reminder' | 'streak' | 'achievement' | 'cortex_insight' | 'lesson_ready' | 'exam_ready' | 'exam_result' | 'deadline' | 'announcement' | 'system';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  href?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface NotificationPreferences {
  enabled: boolean;
  studyReminders: boolean;
  streaks: boolean;
  achievements: boolean;
  cortexInsights: boolean;
  lessonReady: boolean;
  examReady: boolean;
  examResults: boolean;
  deadlines: boolean;
  announcements: boolean;
  system: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  studyReminders: true,
  streaks: true,
  achievements: true,
  cortexInsights: true,
  lessonReady: true,
  examReady: true,
  examResults: true,
  deadlines: true,
  announcements: true,
  system: true,
};

export function isNotificationEnabled(type: NotificationType, preferences: NotificationPreferences): boolean {
  if (!preferences.enabled) return false;
  const map: Record<NotificationType, keyof NotificationPreferences> = {
    study_reminder: 'studyReminders', streak: 'streaks', achievement: 'achievements', cortex_insight: 'cortexInsights',
    lesson_ready: 'lessonReady', exam_ready: 'examReady', exam_result: 'examResults', deadline: 'deadlines',
    announcement: 'announcements', system: 'system',
  };
  return preferences[map[type]];
}
