import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CurriculumBoard, EducationStage } from '@/lib/curriculum/catalog';
import type { LearnerContext } from '@/lib/learner/context';

export const dynamic = 'force-dynamic';

const boards: Record<string, CurriculumBoard> = { caie: 'cambridge', cambridge: 'cambridge', zimsec: 'zimsec', ib: 'ib', edexcel: 'pearson_edexcel', pearson: 'pearson_edexcel', aqa: 'aqa', ocr: 'ocr', waec: 'waec' };
const stages: Record<string, EducationStage> = { primary: 'primary', form_1_2: 'lower_secondary', lower_secondary: 'lower_secondary', secondary: 'upper_secondary', o_level: 'upper_secondary', igcse: 'upper_secondary', advanced_secondary: 'advanced_secondary', a_level: 'advanced_secondary', tertiary: 'tertiary', university: 'tertiary', polytechnic: 'tertiary', tvet: 'tertiary' };

function arrayOf(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean))] : []; }

export async function GET(request: NextRequest) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: cookies => cookies.forEach(({ name, value }) => request.cookies.set(name, value)) } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const [{ data: profile, error: profileError }, { data: academic, error: academicError }, { data: subjectRows, error: subjectsError }] = await Promise.all([
    supabase.from('user_profiles').select('education_level, subject_interests, onboarding_completed, enrolled_courses').eq('user_id', user.id).maybeSingle(),
    supabase.from('academic_contexts').select('pathway, institution, programme, year_level, semester, courses').eq('user_id', user.id).maybeSingle(),
    supabase.from('subjects').select('name').eq('user_id', user.id),
  ]);
  if (profileError || academicError || subjectsError) return NextResponse.json({ error: 'Could not load academic profile.' }, { status: 500 });

  const metadata = user.user_metadata ?? {};
  const rawBoard = [metadata.board, metadata.exam_board, metadata.curriculum_board].find(x => typeof x === 'string') as string | undefined;
  const rawStage = [metadata.stage, profile?.education_level, academic?.pathway].find(x => typeof x === 'string') as string | undefined;
  const board = rawBoard ? boards[rawBoard.trim().toLowerCase()] : undefined;
  const stage = rawStage ? stages[rawStage.trim().toLowerCase().replace(/[- ]+/g, '_')] : undefined;
  const qualification = typeof metadata.qualification === 'string' ? metadata.qualification.trim() : (academic?.programme?.trim() || undefined);
  const subjects = [...new Set([...(subjectRows ?? []).map(row => row.name), ...arrayOf(profile?.subject_interests), ...arrayOf(profile?.enrolled_courses), ...arrayOf(academic?.courses)])];
  const complete = Boolean(profile?.onboarding_completed && stage && board && qualification && subjects.length);
  if (!complete) return NextResponse.json({ error: 'ACADEMIC_CONTEXT_INCOMPLETE' }, { status: 409 });

  const context: LearnerContext = { userId: user.id, displayName: typeof metadata.display_name === 'string' ? metadata.display_name : undefined, avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined, stage: stage!, board: board!, qualification, syllabusCode: typeof metadata.syllabus_code === 'string' ? metadata.syllabus_code.trim() : undefined, syllabusYear: typeof metadata.syllabus_year === 'string' ? metadata.syllabus_year.trim() : undefined, schoolName: academic?.institution ?? undefined, subjects, timezone: typeof metadata.timezone === 'string' ? metadata.timezone : undefined, locale: typeof metadata.locale === 'string' ? metadata.locale : undefined, onboardingComplete: true };
  return NextResponse.json(context, { headers: { 'Cache-Control': 'private, no-store' } });
}
