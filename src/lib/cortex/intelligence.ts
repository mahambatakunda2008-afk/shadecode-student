/**
 * Cortex Intelligence Engine
 *
 * The central brain that generates contextual, personalized insights
 * by analyzing the student's full learning profile from memory,
 * exam history, study patterns, and task data.
 *
 * Complements the existing AI gateway by:
 *  - Generating deeper learning path recommendations
 *  - Identifying study patterns and weak areas
 *  - Providing focus recommendations
 *  - Creating personalized learning strategies
 */

import { getMemory, type CortexUserMemory } from "./memory";
import { createClient } from "@/lib/supabase/client";
import { trackStudySession, trackExamResult, updateStreak, generateLearningInsight, generateRecommendation } from "./memoryTracker";
import { callAI } from "@/lib/ai";

export interface IntelligenceContext {
  userId: string;
  memory: CortexUserMemory;
  recentExams: Array<{ subject: string; score: number; completedAt: string }>;
  subjectCount: number;
  totalTasks: number;
  completedTasks: number;
}

export interface IntelligenceReport {
  learningInsight: string;
  recommendation: string;
  focus: string;
  weakAreas: string[];
  strongAreas: string[];
  nextAction: string;
}

export interface StudyPatternAnalysis {
  preferredTimeOfDay: string;
  averageSessionMinutes: number;
  consistencyScore: number;
  subjectBalance: string;
  trend: "improving" | "declining" | "stable";
}

async function buildContext(userId: string): Promise<IntelligenceContext> {
  const memory = await getMemory(userId);
  const supabase = createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, completed")
    .eq("user_id", userId);

  const subjectCount = subjects?.length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter(t => t.completed).length ?? 0;

  return {
    userId,
    memory,
    recentExams: ((memory.examScores ?? []).slice(-10) as Array<{ score: number; subject: string; date: string }>).map(e => ({
      subject: e.subject,
      score: e.score,
      completedAt: e.date,
    })),
    subjectCount,
    totalTasks,
    completedTasks,
  };
}

export async function analyzeStudyPatterns(userId: string): Promise<StudyPatternAnalysis> {
  const ctx = await buildContext(userId);
  const { memory } = ctx;

  const preferredHours = memory.preferredStudyHours ?? [];
  const hourFrequencies: Record<number, number> = {};
  for (let i = 0; i < preferredHours.length; i += 2) {
    const hour = preferredHours[i] as number;
    const freq = preferredHours[i + 1] as number || 1;
    hourFrequencies[hour] = freq;
  }

  const bestHour = Object.entries(hourFrequencies)
    .sort(([, a], [, b]) => b - a)
    .map(([h]) => parseInt(h))[0];

  const timeLabels: Record<number, string> = {
    6: "early morning", 7: "early morning", 8: "morning", 9: "morning",
    10: "late morning", 11: "late morning", 12: "midday", 13: "afternoon",
    14: "afternoon", 15: "afternoon", 16: "late afternoon", 17: "late afternoon",
    18: "evening", 19: "evening", 20: "evening", 21: "night",
    22: "night", 23: "late night",
  };

  const avgSession = memory.averageSessionDuration ?? 0;
  const totalSessions = memory.totalStudySessions ?? 0;
  const subjectBalance = ctx.subjectCount <= 1 ? "focused" : ctx.subjectCount >= 4 ? "broad" : "moderate";

  const recentScores = ctx.recentExams;
  const trend: "improving" | "declining" | "stable" =
    recentScores.length < 2 ? "stable"
    : recentScores[recentScores.length - 1].score > recentScores[0].score ? "improving"
    : recentScores[recentScores.length - 1].score < recentScores[0].score ? "declining"
    : "stable";

  return {
    preferredTimeOfDay: bestHour ? (timeLabels[bestHour] ?? "various") : "various",
    averageSessionMinutes: avgSession,
    consistencyScore: Math.min(100, totalSessions * 10 + (memory.streak ?? 0) * 5),
    subjectBalance,
    trend,
  };
}

export async function generateFullReport(userId: string): Promise<IntelligenceReport> {
  const ctx = await buildContext(userId);
  const { memory, subjectCount, completedTasks, totalTasks } = ctx;

  const weakAreas = memory.weakSubjects ?? [];
  const strongAreas = memory.strongSubjects ?? [];

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const patterns = await analyzeStudyPatterns(userId);
  const learningInsight = await generateLearningInsight(userId);
  const recommendation = await generateRecommendation(userId);

  let focus: string;
  if (weakAreas.length > 0) {
    focus = `Strengthen ${weakAreas.slice(0, 2).join(" and ")}`;
  } else if (completionRate < 50 && totalTasks > 0) {
    focus = "Catch up on pending tasks";
  } else if (patterns.trend === "improving") {
    focus = "Maintain momentum with challenging material";
  } else {
    focus = "Continue building consistent study habits";
  }

  let nextAction: string;
  if (weakAreas.length > 0 && weakAreas.length <= 2) {
    nextAction = `Create a study plan for ${weakAreas[0]}`;
  } else if (totalTasks > completedTasks) {
    nextAction = `Complete ${totalTasks - completedTasks} pending task${totalTasks - completedTasks !== 1 ? "s" : ""}`;
  } else if (subjectCount === 0) {
    nextAction = "Add your first subject to begin learning";
  } else {
    nextAction = "Review your dashboard for personalized recommendations";
  }

  return {
    learningInsight: `${learningInsight} ${patterns.trend === "improving" ? "Your performance is trending upward." : patterns.trend === "declining" ? "Consider revisiting recent material." : "Keep up the steady work."}`,
    recommendation,
    focus,
    weakAreas,
    strongAreas,
    nextAction,
  };
}

export async function generatePersonalizedPrompt(
  userId: string,
  topic: string,
  context?: Record<string, unknown>
): Promise<string> {
  const ctx = await buildContext(userId);
  const { memory } = ctx;
  const patterns = await analyzeStudyPatterns(userId);

  const basePrompt = `You are Shadecode's AI Tutor. You are teaching a student about: ${topic}

Student Profile:
- Level: ${memory.level}
- Current streak: ${memory.streak} days
- Strong subjects: ${(memory.strongSubjects ?? []).join(", ") || "developing"}
- Areas needing practice: ${(memory.weakSubjects ?? []).join(", ") || "none identified yet"}
- Study pattern: ${patterns.subjectBalance} across subjects
- Preferred time: ${patterns.preferredTimeOfDay}
- Average session length: ${patterns.averageSessionMinutes} minutes

Teaching Guidelines:
1. Adapt explanations to the student's level
2. Focus on ${(memory.weakSubjects ?? []).slice(0, 2).join(" and ") || "the topic"} if relevant
3. Use concrete examples
4. Check understanding with questions
5. Break complex ideas into steps`;

  if (context) {
    const contextStr = Object.entries(context)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join("\n");
    return `${basePrompt}\n\nContext:\n${contextStr}`;
  }

  return basePrompt;
}
