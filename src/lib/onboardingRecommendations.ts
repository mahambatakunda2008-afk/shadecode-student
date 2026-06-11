import type { EducationLevel, SubjectInterest } from '@/types/onboarding';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

  // Build merged recommended subject list: prefer explicit interests, then goal-mapped subjects
  const recommendedSubjects: string[] = [];
  if (Array.isArray(subjectInterests) && subjectInterests.length > 0) {
    for (const s of subjectInterests) if (!recommendedSubjects.includes(s)) recommendedSubjects.push(s);
  }
  for (const g of selectedGoals) {
    const s = GOAL_TO_SUBJECT[g];
    if (s && !recommendedSubjects.includes(s)) recommendedSubjects.push(s);
  }
  if (recommendedSubjects.length === 0) recommendedSubjects.push('mathematics');

  // Choose top subject and course suggestion
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
  };
}
