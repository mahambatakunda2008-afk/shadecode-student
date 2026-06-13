import type { EducationLevel, SubjectInterest } from '@/types/onboarding';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recommendationEngine, RecommendationEngineInput, GoalInput, WeakAreaInput, CareerInterestInput } from '@/lib/recommendation-engine';

// Deterministic mappings for Phase 1 recommendations (keeps behavior simple and auditable)
const GOAL_TO_SUBJECT: Record<string, SubjectInterest> = {
  'Pass school exams': 'mathematics',
  'Improve grades': 'mathematics',
  'Learn a new skill': 'coding',
  'Prepare for university': 'mathematics',
  'Get a job': 'computer_science',
  'Change careers': 'business',
  'Build projects': 'computer_science',
  'Explore interests': 'english',
};

const GOAL_TO_COURSE_TITLE: Record<string, string> = {
  'Pass school exams': 'Exam Sprint — Foundations',
  'Improve grades': 'Grade Booster Program',
  'Learn a new skill': 'Skill Launcher',
  'Prepare for university': 'University Readiness Pack',
  'Get a job': 'Career Starter — Job-Ready Skills',
  'Change careers': 'Career Pivot Project',
  'Build projects': 'Project Builder Series',
  'Explore interests': 'Discovery Modules',
};

export async function generateOnboardingRecommendations(userId: string, goals: string[] | undefined, educationLevel?: EducationLevel, subjectInterests?: SubjectInterest[]) {
  const supabase = await createSupabaseServerClient();

  const selectedGoals = (goals ?? []) as string[];

  // Persist goals as a canonical Cortex insight.
  try {
    await supabase.from('cortex_insights').insert({
      user_id: userId,
      insight: `Onboarding goals selected: ${selectedGoals.join(', ') || 'none'}.`,
    });
  } catch (e) {
    // Non-fatal: don't block onboarding
    console.error('[onboarding] failed to persist goals insight:', e instanceof Error ? e.message : e);
  }

  // Try to use Recommendation Engine for more sophisticated recommendations
  try {
    const engineInput = buildOnboardingEngineInput(userId, selectedGoals, educationLevel, subjectInterests);
    const engineOutput = await recommendationEngine.generateRecommendations(engineInput);
    
    // Use engine output to enhance recommendations
    const engineBasedSubjects = extractSubjectsFromEngine(engineOutput);
    const engineBasedCourse = extractCourseFromEngine(engineOutput, selectedGoals);
    
    // Merge engine recommendations with deterministic mappings
    const recommendedSubjects: string[] = [];
    
    // Prefer engine-based subjects
    if (engineBasedSubjects.length > 0) {
      for (const s of engineBasedSubjects) if (!recommendedSubjects.includes(s)) recommendedSubjects.push(s);
    }
    
    // Fall back to goal-mapped subjects
    if (recommendedSubjects.length === 0) {
      if (Array.isArray(subjectInterests) && subjectInterests.length > 0) {
        for (const s of subjectInterests) if (!recommendedSubjects.includes(s)) recommendedSubjects.push(s);
      }
      for (const g of selectedGoals) {
        const s = GOAL_TO_SUBJECT[g];
        if (s && !recommendedSubjects.includes(s)) recommendedSubjects.push(s);
      }
    }
    
    if (recommendedSubjects.length === 0) recommendedSubjects.push('mathematics');

    const topSubject = recommendedSubjects[0] as SubjectInterest;
    const suggestedCourseTitle = engineBasedCourse || (selectedGoals.length > 0 ? GOAL_TO_COURSE_TITLE[selectedGoals[0]] ?? 'Starter Course' : 'Starter Course');

    // Ensure subject exists for user and create a lightweight starter lesson
    let subjectId: string | null = null;
    try {
      const subjName = topSubject.replace('_', ' ');
      const { data: existing } = await supabase.from('subjects').select('id').eq('user_id', userId).eq('name', subjName).maybeSingle();
      if (existing?.id) subjectId = existing.id;
      else {
        const { data: inserted } = await supabase.from('subjects').insert({ user_id: userId, name: subjName }).select('id').single();
        subjectId = inserted?.id ?? null;
      }
    } catch (e) {
      console.error('[onboarding] subject ensure failed:', e instanceof Error ? e.message : e);
    }

    // Create starter lesson (non-blocking)
    let firstLesson: { id?: string; title: string; description?: string } | null = null;
    try {
      if (subjectId) {
        const title = `Getting started: ${topSubject.replace('_', ' ')}`;
        const description = `A short 15–30 minute introduction to ${topSubject.replace('_', ' ')} tailored to your goals.`;
        const { data: lesson } = await supabase.from('learn_lessons').insert({
          user_id: userId,
          subject_id: subjectId,
          title,
          description,
          difficulty: 'easy',
          progress: 0,
        }).select('id, title, description').single();
        firstLesson = lesson ?? { title, description };
      }
    } catch (e) {
      console.error('[onboarding] starter lesson create failed:', e instanceof Error ? e.message : e);
    }

    return {
      recommendedSubjects,
      suggestedCourse: { title: suggestedCourseTitle, summary: `A short course to help with: ${selectedGoals.join(', ')}` },
      firstLesson,
      source: 'recommendation-engine',
    };
  } catch (error) {
    console.error('[onboarding] Error using recommendation engine:', error);
    // Fall back to old logic
  }

  // Fallback to old logic (preserved for backward compatibility)
  const recommendedSubjects: string[] = [];
  if (Array.isArray(subjectInterests) && subjectInterests.length > 0) {
    for (const s of subjectInterests) if (!recommendedSubjects.includes(s)) recommendedSubjects.push(s);
  }
  for (const g of selectedGoals) {
    const s = GOAL_TO_SUBJECT[g];
    if (s && !recommendedSubjects.includes(s)) recommendedSubjects.push(s);
  }
  if (recommendedSubjects.length === 0) recommendedSubjects.push('mathematics');

  const topSubject = recommendedSubjects[0] as SubjectInterest;
  const suggestedCourseTitle = selectedGoals.length > 0 ? GOAL_TO_COURSE_TITLE[selectedGoals[0]] ?? 'Starter Course' : 'Starter Course';

  // Ensure subject exists for user and create a lightweight starter lesson
  let subjectId: string | null = null;
  try {
    const subjName = topSubject.replace('_', ' ');
    const { data: existing } = await supabase.from('subjects').select('id').eq('user_id', userId).eq('name', subjName).maybeSingle();
    if (existing?.id) subjectId = existing.id;
    else {
      const { data: inserted } = await supabase.from('subjects').insert({ user_id: userId, name: subjName }).select('id').single();
      subjectId = inserted?.id ?? null;
    }
  } catch (e) {
    console.error('[onboarding] subject ensure failed:', e instanceof Error ? e.message : e);
  }

  // Create starter lesson (non-blocking)
  let firstLesson: { id?: string; title: string; description?: string } | null = null;
  try {
    if (subjectId) {
      const title = `Getting started: ${topSubject.replace('_', ' ')}`;
      const description = `A short 15–30 minute introduction to ${topSubject.replace('_', ' ')} tailored to your goals.`;
      const { data: lesson } = await supabase.from('learn_lessons').insert({
        user_id: userId,
        subject_id: subjectId,
        title,
        description,
        difficulty: 'easy',
        progress: 0,
      }).select('id, title, description').single();
      firstLesson = lesson ?? { title, description };
    }
  } catch (e) {
    console.error('[onboarding] starter lesson create failed:', e instanceof Error ? e.message : e);
  }

  return {
    recommendedSubjects,
    suggestedCourse: { title: suggestedCourseTitle, summary: `A short course to help with: ${selectedGoals.join(', ')}` },
    firstLesson,
    source: 'legacy',
  };
}

/**
 * Build Recommendation Engine input from onboarding data
 */
function buildOnboardingEngineInput(userId: string, goals: string[], educationLevel?: EducationLevel, subjectInterests?: SubjectInterest[]): RecommendationEngineInput {
  // Build goals from onboarding goals
  const engineGoals: GoalInput[] = goals.map((goal, index) => ({
    id: crypto.randomUUID(),
    goal,
    priority: index === 0 ? "high" : "medium",
    completed: false,
  }));

  // Build curriculum progress (empty for new users)
  const curriculumProgress = {
    overallCompletion: 0,
    curriculum: {
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
      lockedLessons: 0,
      completionPercentage: 0,
      weightedCompletion: 0,
      currentLesson: null,
      recommendedNextLesson: null,
    },
    lessons: [],
    subjects: [],
  };

  // Build weak areas (empty for new users)
  const weakAreas: WeakAreaInput[] = [];

  // Build exam readiness (simplified for new users)
  const examReadiness = {
    subject: "General",
    board: "ZIMSEC",
    level: "O-Level",
    overallScore: 0,
    readinessLevel: "Not Ready" as const,
    predictedGrade: "F",
    confidence: 0,
    timeToExam: 90, // Assume 3 months for new users
    topicReadiness: {},
  };

  // Build study activity (empty for new users)
  const studyActivity = {
    sessions: [],
    timeSpent: {},
    patterns: {
      mostActiveTime: "10:00",
      mostActiveDay: "Monday",
      averageDailyStudyTime: 0,
      studyFrequency: 0,
      consistencyScore: 0,
    },
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: new Date().toISOString(),
    },
  };

  // Build career interests (empty for now)
  const careerInterests: CareerInterestInput[] = [];

  return {
    userId,
    curriculumProgress,
    weakAreas,
    examReadiness,
    studyActivity,
    goals: engineGoals,
    careerInterests,
  };
}

/**
 * Extract subjects from Recommendation Engine output
 */
function extractSubjectsFromEngine(engineOutput: any): string[] {
  const subjects: string[] = [];
  
  if (engineOutput.recommendedLesson.lessonId !== "unknown") {
    subjects.push(engineOutput.recommendedLesson.subject);
  }
  
  if (engineOutput.recommendedRevisionTopic.topicId !== "none") {
    subjects.push(engineOutput.recommendedRevisionTopic.subject);
  }
  
  if (engineOutput.recommendedExamPractice.subject) {
    subjects.push(engineOutput.recommendedExamPractice.subject);
  }
  
  return subjects;
}

/**
 * Extract course title from Recommendation Engine output
 */
function extractCourseFromEngine(engineOutput: any, goals: string[]): string | null {
  // Use the recommended study action to determine course type
  if (engineOutput.recommendedStudyAction.category === "lesson") {
    return "Starter Course";
  }
  
  // Fall back to goal-based mapping
  if (goals.length > 0) {
    return GOAL_TO_COURSE_TITLE[goals[0]] || null;
  }
  
  return null;
}
