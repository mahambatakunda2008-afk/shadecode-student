export type NotificationType = 'study_reminder' | 'streak' | 'achievement' | 'lesson_ready' | 'exam_ready' | 'exam_result' | 'deadline' | 'system' | 'cortex_insight' | 'announcement';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  inApp: boolean;
  studyReminders: boolean;
  streaks: boolean;
  achievements: boolean;
  lessonReady: boolean;
  examResults: boolean;
  deadlines: boolean;
  cortexInsights: boolean;
  announcements: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  studyReminders: true,
  streaks: true,
  achievements: true,
  lessonReady: true,
  examResults: true,
  deadlines: true,
  cortexInsights: true,
  announcements: true,
};

export function isNotificationEnabled(type: NotificationType, preferences: NotificationPreferences) {
  if (!preferences.inApp) return false;
  switch (type) {
    case 'study_reminder': return preferences.studyReminders;
    case 'streak': return preferences.streaks;
    case 'achievement': return preferences.achievements;
    case 'lesson_ready': return preferences.lessonReady;
    case 'exam_result': return preferences.examResults;
    case 'deadline': return preferences.deadlines;
    case 'cortex_insight': return preferences.cortexInsights;
    case 'announcement': return preferences.announcements;
    default: return true;
  }
}
