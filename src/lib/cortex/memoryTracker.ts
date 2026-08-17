/**
 * /lib/cortex/memoryTracker.ts
 *
 * Cortex Memory Tracker: Updates persistent memory based on learning events.
 */

import { getMemory, updateMemory } from "./memory";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { computeStreakUpdate } from "@/lib/streaks";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service-role configuration is missing");
  }

  return createSupabaseServiceClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
}

function normalizeDuration(durationMinutes: number): number {
  return Number.isFinite(durationMinutes) && durationMinutes > 0
    ? Math.min(durationMinutes, 24 * 60)
    : 0;
}

/** Track a study session (lesson completion, practice session, etc.). */
export async function trackStudySession(session: StudySession): Promise<void> {
  const memory = await getMemory(session.userId);
  const durationMinutes = normalizeDuration(session.durationMinutes);

  if (durationMinutes <= 0) return;

  const completedAt = new Date(session.completedAt);
  if (Number.isNaN(completedAt.getTime())) return;

  const totalStudyTime = Math.max(0, memory.totalStudyTimeMinutes || 0) + durationMinutes;
  const totalSessions = Math.max(0, memory.totalStudySessions || 0) + 1;
  const avgDuration = Math.round(totalStudyTime / totalSessions);

  // preferredStudyHours is stored as [hour, frequency, hour, frequency, ...].
  // Iterate by pairs so a frequency value can never be mistaken for an hour.
  const hour = completedAt.getHours();
  const preferredHours = [...(memory.preferredStudyHours || [])];
  let hourIndex = -1;
  for (let i = 0; i < preferredHours.length; i += 2) {
    if (preferredHours[i] === hour) {
      hourIndex = i;
      break;
    }
  }

  if (hourIndex >= 0) {
    preferredHours[hourIndex + 1] = Math.max(0, preferredHours[hourIndex + 1] || 0) + 1;
  } else {
    preferredHours.push(hour, 1);
  }

  const subjects = [...(memory.frequentlyStudiedSubjects || [])];
  const subjectName = session.subjectName.trim();
  if (subjectName) {
    const subjectIndex = subjects.findIndex((s) => s === subjectName);
    if (subjectIndex >= 0) {
      subjects.splice(subjectIndex, 1);
    }
    subjects.unshift(subjectName);
    if (subjects.length > 10) subjects.pop();
  }

  await updateMemory(session.userId, {
    totalStudyTimeMinutes: totalStudyTime,
    totalStudySessions: totalSessions,
    averageSessionDuration: avgDuration,
    preferredStudyHours: preferredHours,
    frequentlyStudiedSubjects: subjects,
    lastStudyDate: completedAt.toISOString(),
  });
}

/** Track an exam result. */
export async function trackExamResult(result: ExamResult): Promise<void> {
  const memory = await getMemory(result.userId);
  const score = clampScore(result.score);
  const subject = result.subject.trim();
  const completedAt = new Date(result.completedAt);

  if (!subject || Number.isNaN(completedAt.getTime())) return;

  const examScores = [...(memory.examScores || [])];
  examScores.push({ score, subject, date: completedAt.toISOString() });
  if (examScores.length > 50) examScores.splice(0, examScores.length - 50);

  const avgScore = examScores.length > 0
    ? Math.round(examScores.reduce((sum, exam) => sum + clampScore(exam.score), 0) / examScores.length)
    : 0;

  const subjectScores = examScores.reduce<Record<string, number[]>>((acc, exam) => {
    if (!acc[exam.subject]) acc[exam.subject] = [];
    acc[exam.subject].push(clampScore(exam.score));
    return acc;
  }, {});

  const weakSubjects: string[] = [];
  const strongSubjects: string[] = [];

  for (const [subjectName, scores] of Object.entries(subjectScores)) {
    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    if (average < 60) weakSubjects.push(subjectName);
    if (average >= 80) strongSubjects.push(subjectName);
  }

  await updateMemory(result.userId, {
    examScores,
    averageExamScore: avgScore,
    weakSubjects,
    strongSubjects,
  });
}

/**
 * Update streak based on study activity. Transition rules live in the pure,
 * tested computeStreakUpdate() helper.
 */
export async function updateStreak(userId: string, studiedToday: boolean): Promise<void> {
  const memory = await getMemory(userId);

  const result = computeStreakUpdate(
    {
      currentStreak: memory.streak || 0,
      longestStreak: memory.longestStreak || 0,
      lastStudyDate: memory.lastStudyDate,
      freezeWeek: memory.streakFreezeWeek,
    },
    studiedToday
  );

  await updateMemory(userId, {
    streak: result.streak,
    longestStreak: result.longestStreak,
    streakFreezeWeek: result.freezeWeek,
  });

  // Keep the dashboard's profiles.streak mirror synchronized with Cortex.
  try {
    const svc = getServiceClient();
    const { error } = await svc
      .from("profiles")
      .update({ streak: result.streak })
      .eq("id", userId);
    if (error) console.error("[memoryTracker] Failed to sync profiles.streak:", error.message);
  } catch (error) {
    console.error("[memoryTracker] profiles.streak sync failed:", error);
  }
}

/** Track lesson completion. */
export async function trackLessonCompletion(
  userId: string,
  subjectId: string,
  subjectName: string,
  durationMinutes: number
): Promise<void> {
  const memory = await getMemory(userId);
  const totalLessons = Math.max(0, memory.totalLessonsCompleted || 0) + 1;

  await trackStudySession({
    userId,
    subjectId,
    subjectName,
    durationMinutes,
    completedAt: new Date().toISOString(),
  });

  await updateMemory(userId, { totalLessonsCompleted: totalLessons });
}

/** Generate a concise learning insight summary. */
export async function generateLearningInsight(userId: string): Promise<string> {
  const memory = await getMemory(userId);
  const insights: string[] = [];

  if (memory.totalStudySessions && memory.totalStudySessions > 5) {
    insights.push(`You've completed ${memory.totalStudySessions} study sessions.`);
  }
  if (memory.strongSubjects?.length) {
    insights.push(`Strong in: ${memory.strongSubjects.join(", ")}.`);
  }
  if (memory.weakSubjects?.length) {
    insights.push(`Areas for improvement: ${memory.weakSubjects.join(", ")}.`);
  }
  if (memory.streak && memory.streak > 3) {
    insights.push(`On a ${memory.streak}-day learning streak!`);
  }
  if (memory.totalStudyTimeMinutes && memory.totalStudyTimeMinutes > 60) {
    insights.push(`Total study time: ${Math.round(memory.totalStudyTimeMinutes / 60)} hours.`);
  }

  return insights.length > 0 ? insights.join(" ") : "Keep learning to build your learning profile!";
}

/**
 * Generate a conservative next-step recommendation from persistent learning
 * signals. This remains deterministic and explainable; model-generated advice
 * can be layered on top later without changing the source of truth.
 */
export async function generateRecommendation(userId: string): Promise<string> {
  const memory = await getMemory(userId);

  if (memory.weakSubjects?.length) {
    const subject = memory.weakSubjects[0];
    if ((memory.averageExamScore || 0) < 60) {
      return `Prioritize ${subject}: your recent exam performance suggests it needs focused review.`;
    }
    return `Focus on ${subject} next to strengthen your understanding.`;
  }

  if ((memory.averageExamScore || 0) >= 80 && memory.frequentlyStudiedSubjects?.length) {
    return `You're performing strongly. Practice ${memory.frequentlyStudiedSubjects[0]} with a harder problem or past-paper question.`;
  }

  if (memory.frequentlyStudiedSubjects?.length) {
    return `Continue with ${memory.frequentlyStudiedSubjects[0]} to build momentum.`;
  }

  if ((memory.totalStudySessions || 0) > 0) {
    return "Choose one recent study area and complete a short practice session next.";
  }

  return "Start with a subject that interests you most, then complete one short practice session.";
}
