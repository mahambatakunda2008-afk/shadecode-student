/**
 * /lib/studyPlan/generator.ts
 *
 * AI-Assisted Study Plan Generator
 *
 * Creates personalized study plans based on goals, available time, and learning data
 */

import { StudyGoals, StudyPlan, StudySession, WeeklySchedule, RevisionBlock, CatchUpRecommendation } from "./types";
import { getMemory } from "@/lib/cortex/memory";

export interface StudyPlanInput extends StudyGoals {
  userId: string;
  startDate?: string;
}

/**
 * Generate a complete study plan based on goals and learning history
 */
export async function generateStudyPlan(input: StudyPlanInput): Promise<StudyPlan> {
  const { userId, targetGrade, examDate, availableHoursPerWeek, subjects, prioritySubjects, startDate } = input;

  // Get user's learning memory for personalization
  const memory = await getMemory(userId);

  // Calculate study timeline
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(examDate);
  const totalWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

  // Generate weekly schedules
  const weeklySchedules: WeeklySchedule[] = [];
  const allSessions: StudySession[] = [];

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + week * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekSessions = generateWeeklySessions({
      weekNumber: week + 1,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      subjects,
      prioritySubjects,
      availableHoursPerWeek,
      totalWeeks,
      currentWeek: week + 1,
      weakSubjects: memory.weakSubjects || [],
      strongSubjects: memory.strongSubjects || [],
    });

    weeklySchedules.push(weekSessions);
    allSessions.push(...weekSessions.sessions);
  }

  // Generate revision blocks based on weak areas
  const revisionBlocks = generateRevisionBlocks({
    subjects,
    weakSubjects: memory.weakSubjects || [],
    examDate,
    totalWeeks,
    availableHoursPerWeek,
  });

  // Generate catch-up recommendations (empty for new plan)
  const catchUpRecommendations: CatchUpRecommendation[] = [];

  const plan: StudyPlan = {
    id: crypto.randomUUID(),
    userId,
    goals: {
      targetGrade,
      examDate,
      availableHoursPerWeek,
      subjects,
      prioritySubjects,
    },
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    weeklySchedules,
    revisionBlocks,
    catchUpRecommendations,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };

  return plan;
}

interface WeeklySessionsInput {
  weekNumber: number;
  startDate: string;
  endDate: string;
  subjects: string[];
  prioritySubjects?: string[];
  availableHoursPerWeek: number;
  totalWeeks: number;
  currentWeek: number;
  weakSubjects?: string[];
  strongSubjects?: string[];
}

function generateWeeklySessions(input: WeeklySessionsInput): WeeklySchedule {
  const { weekNumber, startDate, endDate, subjects, prioritySubjects, availableHoursPerWeek, totalWeeks, currentWeek, weakSubjects, strongSubjects } = input;

  const sessions: StudySession[] = [];
  const totalMinutes = availableHoursPerWeek * 60;
  const daysInWeek = 7;

  // Distribute time across subjects
  const subjectDistribution = calculateSubjectDistribution({
    subjects,
    prioritySubjects,
    weakSubjects,
    strongSubjects,
    totalWeeks,
    currentWeek,
  });

  // Generate sessions for each day
  const start = new Date(startDate);
  for (let day = 0; day < daysInWeek; day++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + day);

    // Skip weekends (optional - can be configured)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Saturday and Sunday

    // Allocate time for this day
    const dailyMinutes = Math.round(totalMinutes / 5); // 5 study days per week

    // Distribute daily time across subjects
    let remainingMinutes = dailyMinutes;
    let subjectIndex = 0;

    while (remainingMinutes > 30 && subjectIndex < subjects.length) {
      const subject = subjects[subjectIndex];
      const subjectAllocation = Math.round(dailyMinutes * (subjectDistribution[subject] || 1 / subjects.length));
      const sessionMinutes = Math.min(subjectAllocation, remainingMinutes);

      if (sessionMinutes >= 30) {
        const sessionType = determineSessionType({
          subject,
          weakSubjects,
          currentWeek,
          totalWeeks,
        });

        sessions.push({
          id: crypto.randomUUID(),
          date: currentDate.toISOString(),
          subject,
          topic: generateTopicPlaceholder(subject, sessionType),
          durationMinutes: sessionMinutes,
          type: sessionType,
          completed: false,
        });
      }

      remainingMinutes -= sessionMinutes;
      subjectIndex++;
    }
  }

  const totalPlannedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    weekNumber,
    startDate,
    endDate,
    sessions,
    totalPlannedMinutes,
    totalCompletedMinutes: 0,
    progress: 0,
  };
}

interface SubjectDistributionInput {
  subjects: string[];
  prioritySubjects?: string[];
  weakSubjects?: string[];
  strongSubjects?: string[];
  totalWeeks: number;
  currentWeek: number;
}

function calculateSubjectDistribution(input: SubjectDistributionInput): Record<string, number> {
  const { subjects, prioritySubjects, weakSubjects, strongSubjects, totalWeeks, currentWeek } = input;

  const distribution: Record<string, number> = {};
  const baseWeight = 1 / subjects.length;

  subjects.forEach(subject => {
    let weight = baseWeight;

    // Increase weight for priority subjects
    if (prioritySubjects?.includes(subject)) {
      weight *= 1.5;
    }

    // Increase weight for weak subjects (more focus needed)
    if (weakSubjects?.includes(subject)) {
      weight *= 1.3;
    }

    // Decrease weight for strong subjects (less focus needed)
    if (strongSubjects?.includes(subject)) {
      weight *= 0.8;
    }

    // Adjust based on timeline (more focus on weak subjects early, revision later)
    const progress = currentWeek / totalWeeks;
    if (progress < 0.5 && weakSubjects?.includes(subject)) {
      weight *= 1.2;
    } else if (progress > 0.7 && strongSubjects?.includes(subject)) {
      weight *= 1.1; // Review strong subjects closer to exam
    }

    distribution[subject] = weight;
  });

  // Normalize weights
  const totalWeight = Object.values(distribution).reduce((sum, w) => sum + w, 0);
  Object.keys(distribution).forEach(subject => {
    distribution[subject] = distribution[subject] / totalWeight;
  });

  return distribution;
}

interface SessionTypeInput {
  subject: string;
  weakSubjects?: string[];
  currentWeek: number;
  totalWeeks: number;
}

function determineSessionType(input: SessionTypeInput): "learn" | "practice" | "revision" | "exam" | "catchup" {
  const { subject, weakSubjects, currentWeek, totalWeeks } = input;
  const progress = currentWeek / totalWeeks;

  // Early phase: focus on learning weak subjects
  if (progress < 0.3 && weakSubjects?.includes(subject)) {
    return "learn";
  }

  // Middle phase: mix of learning and practice
  if (progress < 0.6) {
    return Math.random() > 0.5 ? "learn" : "practice";
  }

  // Late phase: focus on revision
  if (progress < 0.9) {
    return "revision";
  }

  // Final phase: exam practice
  return "exam";
}

function generateTopicPlaceholder(subject: string, sessionType: string): string {
  const topics: Record<string, Record<string, string[]>> = {
    math: {
      learn: ["Algebra fundamentals", "Geometry basics", "Calculus introduction"],
      practice: ["Problem solving", "Past paper questions", "Drill exercises"],
      revision: ["Key formulas", "Common mistakes", "Exam techniques"],
      exam: ["Full past paper", "Timed practice", "Mock exam"],
    },
    physics: {
      learn: ["Mechanics", "Electricity", "Waves"],
      practice: ["Calculations", "Diagrams", "Applications"],
      revision: ["Key concepts", "Formula sheet", "Practical skills"],
      exam: ["Full past paper", "Timed practice", "Mock exam"],
    },
    chemistry: {
      learn: ["Atomic structure", "Bonding", "Reactions"],
      practice: ["Equations", "Calculations", "Lab techniques"],
      revision: ["Periodic table", "Key reactions", "Safety"],
      exam: ["Full past paper", "Timed practice", "Mock exam"],
    },
  };

  const subjectTopics = topics[subject.toLowerCase()] || topics.math;
  const typeTopics = subjectTopics[sessionType] || subjectTopics.learn;
  return typeTopics[Math.floor(Math.random() * typeTopics.length)];
}

interface RevisionBlocksInput {
  subjects: string[];
  weakSubjects: string[];
  examDate: string;
  totalWeeks: number;
  availableHoursPerWeek: number;
}

function generateRevisionBlocks(input: RevisionBlocksInput): RevisionBlock[] {
  const { subjects, weakSubjects, examDate, totalWeeks, availableHoursPerWeek } = input;

  const blocks: RevisionBlock[] = [];
  const exam = new Date(examDate);

  // Schedule revision blocks in the final 3 weeks
  const revisionWeeks = 3;
  const revisionStartWeek = totalWeeks - revisionWeeks + 1;

  for (let week = revisionStartWeek; week <= totalWeeks; week++) {
    const weekDate = new Date(exam);
    weekDate.setDate(weekDate.getDate() - (totalWeeks - week) * 7);

    // Prioritize weak subjects for revision
    const subjectsToRevise = [...weakSubjects, ...subjects.filter(s => !weakSubjects.includes(s))].slice(0, 3);

    subjectsToRevise.forEach((subject, index) => {
      const priority: "high" | "medium" | "low" = weakSubjects.includes(subject) ? "high" : index === 0 ? "medium" : "low";
      const duration = priority === "high" ? 90 : priority === "medium" ? 60 : 45;

      blocks.push({
        id: crypto.randomUUID(),
        subject,
        topics: [generateTopicPlaceholder(subject, "revision")],
        scheduledDate: weekDate.toISOString(),
        durationMinutes: duration,
        priority,
        reason: weakSubjects.includes(subject) ? "Weak area requiring focused revision" : "General revision for exam preparation",
      });
    });
  }

  return blocks;
}

/**
 * Adjust study plan based on actual progress
 */
export function adjustStudyPlan(
  plan: StudyPlan,
  completedSessions: StudySession[],
  currentWeek: number
): StudyPlan {
  const adjustments: CatchUpRecommendation[] = [];
  const updatedWeeklySchedules = [...plan.weeklySchedules];

  // Analyze progress for past weeks
  for (let week = 0; week < currentWeek - 1; week++) {
    const weekSchedule = updatedWeeklySchedules[week];
    if (!weekSchedule) continue;

    const weekSessions = weekSchedule.sessions;
    const completedInWeek = completedSessions.filter(s => {
      const sessionDate = new Date(s.date);
      const weekStart = new Date(weekSchedule.startDate);
      const weekEnd = new Date(weekSchedule.endDate);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });

    const plannedMinutes = weekSchedule.totalPlannedMinutes;
    const completedMinutes = completedInWeek.reduce((sum, s) => sum + (s.actualDurationMinutes || s.durationMinutes), 0);
    const completionRate = completedMinutes / plannedMinutes;

    // If completion rate is below 70%, generate catch-up recommendations
    if (completionRate < 0.7) {
      const missedMinutes = plannedMinutes - completedMinutes;
      const missedSessions = weekSessions.filter(s => !completedInWeek.find(c => c.id === s.id));

      missedSessions.forEach(session => {
        adjustments.push({
          id: crypto.randomUUID(),
          subject: session.subject,
          topic: session.topic,
          missedSessions: 1,
          recommendedAction: `Complete missed ${session.type} session on ${session.subject}`,
          suggestedDate: new Date().toISOString(), // Schedule for this week
          estimatedDurationMinutes: session.durationMinutes,
        });
      });
    }

    // Update week progress
    weekSchedule.totalCompletedMinutes = completedMinutes;
    weekSchedule.progress = Math.round(completionRate * 100);
  }

  return {
    ...plan,
    weeklySchedules: updatedWeeklySchedules,
    catchUpRecommendations: [...plan.catchUpRecommendations, ...adjustments],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate study progress statistics
 */
export function calculateStudyProgress(plan: StudyPlan, completedSessions: StudySession[]) {
  const totalSessionsPlanned = plan.weeklySchedules.reduce((sum, week) => sum + week.sessions.length, 0);
  const totalSessionsCompleted = completedSessions.filter(s => s.completed).length;
  const totalPlannedMinutes = plan.weeklySchedules.reduce((sum, week) => sum + week.totalPlannedMinutes, 0);
  const totalCompletedMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDurationMinutes || s.durationMinutes), 0);
  const averageSessionDuration = totalSessionsCompleted > 0 ? totalCompletedMinutes / totalSessionsCompleted : 0;

  // Calculate streak (consecutive days with completed sessions)
  const completedDates = [...new Set(completedSessions.filter(s => s.completed).map(s => s.date.split('T')[0]))].sort();
  let streakDays = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = completedDates.length - 1; i >= 0; i--) {
    const date = new Date(completedDates[i]);
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - (completedDates.length - 1 - i));

    if (date.toDateString() === expectedDate.toDateString()) {
      streakDays++;
    } else {
      break;
    }
  }

  const progress = totalPlannedMinutes > 0 ? totalCompletedMinutes / totalPlannedMinutes : 0;
  const onTrack = progress >= 0.8;

  // Project grade based on progress and target
  let projectedGrade: string | undefined;
  if (progress >= 0.9) {
    projectedGrade = plan.goals.targetGrade;
  } else if (progress >= 0.7) {
    const grades = ["A*", "A", "B", "C", "D", "E", "U"];
    const targetIndex = grades.indexOf(plan.goals.targetGrade);
    projectedGrade = grades[Math.min(targetIndex + 1, grades.length - 1)];
  } else if (progress >= 0.5) {
    const grades = ["A*", "A", "B", "C", "D", "E", "U"];
    const targetIndex = grades.indexOf(plan.goals.targetGrade);
    projectedGrade = grades[Math.min(targetIndex + 2, grades.length - 1)];
  }

  return {
    totalSessionsPlanned,
    totalSessionsCompleted,
    totalPlannedMinutes,
    totalCompletedMinutes,
    averageSessionDuration,
    streakDays,
    onTrack,
    projectedGrade,
  };
}
