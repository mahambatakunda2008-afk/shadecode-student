/**
 * /lib/cortex/memoryTracker.ts
 *
 * Cortex Memory Tracker: Updates persistent memory based on learning events
 *
 * Responsibility:
 * - Track subject mastery patterns
 * - Track study time patterns
 * - Track exam performance trends
 * - Update streak patterns
 * - Generate memory summaries
 */

import { getMemory, updateMemory } from "./memory";
import { createClient } from "@/lib/supabase/client";

interface StudySession {
  userId: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  completedAt: string;
}

interface ExamResult {
  userId: string;
  subject: string;
  score: number;
  completedAt: string;
}

/**
 * Track a study session (lesson completion, practice session, etc.)
 */
export async function trackStudySession(session: StudySession): Promise<void> {
  const memory = await getMemory(session.userId);
  
  // Update study time metrics
  const totalStudyTime = (memory.totalStudyTimeMinutes || 0) + session.durationMinutes;
  const totalSessions = (memory.totalStudySessions || 0) + 1;
  const avgDuration = totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0;
  
  // Track study hour (0-23)
  const hour = new Date(session.completedAt).getHours();
  const preferredHours = [...(memory.preferredStudyHours || [])];
  const hourIndex = preferredHours.findIndex(h => h === hour);
  if (hourIndex >= 0) {
    // Increment frequency (stored as [hour, frequency] pairs)
    preferredHours[hourIndex + 1] = (preferredHours[hourIndex + 1] as number) + 1;
  } else {
    preferredHours.push(hour, 1);
  }
  
  // Track subject frequency
  const subjects = [...(memory.frequentlyStudiedSubjects || [])];
  const subjectIndex = subjects.findIndex(s => s === session.subjectName);
  if (subjectIndex >= 0) {
    // Move to front (most recent)
    subjects.splice(subjectIndex, 1);
    subjects.unshift(session.subjectName);
  } else {
    subjects.unshift(session.subjectName);
    // Keep only top 10
    if (subjects.length > 10) subjects.pop();
  }
  
  // Update last study date
  const lastStudyDate = session.completedAt;
  
  await updateMemory(session.userId, {
    totalStudyTimeMinutes: totalStudyTime,
    totalStudySessions: totalSessions,
    averageSessionDuration: avgDuration,
    preferredStudyHours: preferredHours,
    frequentlyStudiedSubjects: subjects,
    lastStudyDate,
  });
}

/**
 * Track an exam result
 */
export async function trackExamResult(result: ExamResult): Promise<void> {
  const memory = await getMemory(result.userId);
  
  // Update exam scores
  const examScores = [...(memory.examScores || [])];
  examScores.push({
    score: result.score,
    subject: result.subject,
    date: result.completedAt,
  });
  
  // Keep only last 50 exam scores
  if (examScores.length > 50) examScores.shift();
  
  // Calculate average
  const avgScore = examScores.length > 0
    ? Math.round(examScores.reduce((sum, e) => sum + e.score, 0) / examScores.length)
    : 0;
  
  // Update weak/strong subjects based on scores
  const subjectScores = examScores.reduce((acc, e) => {
    if (!acc[e.subject]) acc[e.subject] = [];
    acc[e.subject].push(e.score);
    return acc;
  }, {} as Record<string, number[]>);
  
  const weakSubjects: string[] = [];
  const strongSubjects: string[] = [];
  
  Object.entries(subjectScores).forEach(([subject, scores]) => {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    if (avg < 60) weakSubjects.push(subject);
    if (avg >= 80) strongSubjects.push(subject);
  });
  
  await updateMemory(result.userId, {
    examScores,
    averageExamScore: avgScore,
    weakSubjects,
    strongSubjects,
  } as any);
}

/**
 * Update streak based on study activity
 */
export async function updateStreak(userId: string, studiedToday: boolean): Promise<void> {
  const memory = await getMemory(userId);
  
  const today = new Date().toISOString().split('T')[0];
  const lastStudyDate = memory.lastStudyDate?.split('T')[0];
  
  let currentStreak = memory.streak || 0;
  let longestStreak = memory.longestStreak || 0;
  
  if (studiedToday) {
    if (lastStudyDate === today) {
      // Already studied today, no change
    } else if (isYesterday(lastStudyDate)) {
      // Studied yesterday, increment streak
      currentStreak++;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      // Streak broken or first day
      currentStreak = 1;
    }
  } else if (lastStudyDate && !isYesterday(lastStudyDate) && lastStudyDate !== today) {
    // Didn't study today and missed yesterday, streak broken
    currentStreak = 0;
  }
  
  await updateMemory(userId, {
    streak: currentStreak,
    longestStreak,
  });
}

/**
 * Track lesson completion
 */
export async function trackLessonCompletion(
  userId: string,
  subjectId: string,
  subjectName: string,
  durationMinutes: number
): Promise<void> {
  const memory = await getMemory(userId);
  
  const totalLessons = (memory.totalLessonsCompleted || 0) + 1;
  
  await trackStudySession({
    userId,
    subjectId,
    subjectName,
    durationMinutes,
    completedAt: new Date().toISOString(),
  });
  
  await updateMemory(userId, {
    totalLessonsCompleted: totalLessons,
  });
}

/**
 * Generate learning insight summary
 */
export async function generateLearningInsight(userId: string): Promise<string> {
  const memory = await getMemory(userId);
  
  const insights: string[] = [];
  
  // Study frequency
  if (memory.totalStudySessions && memory.totalStudySessions > 5) {
    insights.push(`You've completed ${memory.totalStudySessions} study sessions.`);
  }
  
  // Subject mastery
  if (memory.strongSubjects && memory.strongSubjects.length > 0) {
    insights.push(`Strong in: ${memory.strongSubjects.join(', ')}.`);
  }
  
  if (memory.weakSubjects && memory.weakSubjects.length > 0) {
    insights.push(`Areas for improvement: ${memory.weakSubjects.join(', ')}.`);
  }
  
  // Streak
  if (memory.streak && memory.streak > 3) {
    insights.push(`On a ${memory.streak}-day learning streak!`);
  }
  
  // Study time
  if (memory.totalStudyTimeMinutes && memory.totalStudyTimeMinutes > 60) {
    const hours = Math.round(memory.totalStudyTimeMinutes / 60);
    insights.push(`Total study time: ${hours} hours.`);
  }
  
  return insights.length > 0 ? insights.join(' ') : 'Keep learning to build your learning profile!';
}

/**
 * Generate recommendation based on memory
 */
export async function generateRecommendation(userId: string): Promise<string> {
  const memory = await getMemory(userId);
  
  // Prioritize weak subjects
  if (memory.weakSubjects && memory.weakSubjects.length > 0) {
    return `Focus on ${memory.weakSubjects[0]} to strengthen your understanding.`;
  }
  
  // Suggest continuing with frequently studied subjects
  if (memory.frequentlyStudiedSubjects && memory.frequentlyStudiedSubjects.length > 0) {
    return `Continue with ${memory.frequentlyStudiedSubjects[0]} to build momentum.`;
  }
  
  // Default recommendation
  return 'Start with a subject that interests you most.';
}

// Helper: Check if a date string is yesterday
function isYesterday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
