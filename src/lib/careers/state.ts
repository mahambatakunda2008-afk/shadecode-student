import { createSupabaseServerClient } from '@/lib/supabase/server';
import { computeCurriculumState, LessonRow } from '@/lib/curriculum';

export async function getCareerState(slug: string, userId?: string) {
  const supabase = await createSupabaseServerClient();

  // Resolve user if not passed
  if (!userId) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) return null;
    userId = data.user.id;
  }

  // Load career and related mappings
  const { data: career } = await supabase.from('careers').select('*').eq('slug', slug).maybeSingle();
  if (!career) return null;

  const { data: skills } = await supabase.from('career_skills').select('skill_id, importance, skills(name, description)').eq('career_id', career.id).order('importance', { ascending: false });
  const { data: recCourses } = await supabase.from('career_recommended_courses').select('subject_id, note').eq('career_id', career.id);

  const subjectIds = (recCourses ?? []).map((r: any) => r.subject_id).filter(Boolean);

  // Load subject metadata
  let subjects: any[] = [];
  if (subjectIds.length > 0) {
    const { data: subs } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
    subjects = subs ?? [];
  }

  // Load user's lessons for these subjects
  const { data: lessonsData } = await supabase.from('learn_lessons').select('id, title, subject_id, difficulty, progress, updated_at').eq('user_id', userId).in('subject_id', subjectIds || []);
  const lessons = (lessonsData ?? []) as LessonRow[];

  // Load prerequisite rows for these lessons
  const lessonIds = lessons.map((l) => l.id);
  let prereqRows: Array<{ lesson_id: string; prerequisite_lesson_id: string }> = [];
  if (lessonIds.length > 0) {
    const { data: pData } = await supabase.from('lesson_prerequisites').select('lesson_id, prerequisite_lesson_id').in('lesson_id', lessonIds);
    const raw = pData ?? [];
    prereqRows = raw.filter((r: any) => lessonIds.includes(r.prerequisite_lesson_id));
  }

  const curriculumState = computeCurriculumState(lessons, prereqRows);

  // Compute per-recommended-course summaries
  const recommendedCourses = (recCourses ?? []).map((r: any) => {
    const sub = subjects.find((s: any) => s.id === r.subject_id);
    const subjectLessons = lessons.filter((l) => l.subject_id === r.subject_id);
    const total = subjectLessons.length;
    const completed = subjectLessons.filter((l) => (l.progress ?? 0) >= 100).length;
    const completionPercent = total === 0 ? 0 : Math.round(subjectLessons.reduce((s, l) => s + (l.progress ?? 0), 0) / total);
    return { subject_id: r.subject_id, subjectName: sub?.name ?? null, note: r.note ?? null, enrolled: total > 0, total, completed, completionPercent };
  });

  const overallCompletionPercent = recommendedCourses.length === 0 ? 0 : Math.round(recommendedCourses.reduce((s, c) => s + c.completionPercent, 0) / recommendedCourses.length);

  const completedLessonCount = curriculumState.completedLessons.length;
  const lockedLessonCount = curriculumState.lockedLessons.length;

  // Recommended next lesson: prefer next unlocked lesson within recommended subjects
  let recommendedNextLesson = curriculumState.recommendedNextLesson;
  if (recommendedNextLesson && subjectIds.length > 0 && !subjectIds.includes(recommendedNextLesson.subject_id)) {
    // try find next available within subjects
    const nexts = curriculumState.allLessons.filter((l) => subjectIds.includes(l.subject_id) && (l.progress ?? 0) < 100 && !curriculumState.lockedLessons.find(x => x.id === l.id));
    if (nexts.length > 0) {
      // sort by updated_at
      nexts.sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return ta - tb;
      });
      recommendedNextLesson = nexts[0];
    } else {
      recommendedNextLesson = null;
    }
  }

  return {
    career,
    skills: skills ?? [],
    recommendedCourses,
    subjects,
    overallCompletionPercent,
    currentLesson: curriculumState.currentLesson,
    recommendedNextLesson,
    completedLessonCount,
    lockedLessonCount,
  };
}
