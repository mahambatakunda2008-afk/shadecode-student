import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { CurriculumBoard, EducationStage } from '@/lib/curriculum/catalog';
import type { LearnerContext } from './context';

const BOARD_ALIASES: Record<string, CurriculumBoard> = {
  caie: 'cambridge',
  cambridge: 'cambridge',
  zimsec: 'zimsec',
  ib: 'ib',
  edexcel: 'pearson_edexcel',
  pearson: 'pearson_edexcel',
};

function asBoard(value: unknown): CurriculumBoard | undefined {
  if (typeof value !== 'string') return undefined;
  return BOARD_ALIASES[value.trim().toLowerCase()];
}

function asStage(value: unknown): EducationStage | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[- ]+/g, '_');
  const aliases: Record<string, EducationStage> = {
    primary: 'primary', secondary: 'upper_secondary', o_level: 'upper_secondary', igcse: 'upper_secondary',
    form_1_2: 'lower_secondary', lower_secondary: 'lower_secondary',
    advanced_secondary: 'advanced_secondary', a_level: 'advanced_secondary',
    tertiary: 'tertiary', university: 'tertiary', polytechnic: 'tertiary', tvet: 'tertiary',
  };
  return aliases[normalized];
}

function cleanArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
    : [];
}

export async function getServerLearnerContext(request: NextRequest): Promise<LearnerContext> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookies => cookies.forEach(({ name, value }) => request.cookies.set(name, value)),
      },
    },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('UNAUTHENTICATED');

  const [{ data: profile, error: profileError }, { data: academic, error: academicError }, { data: subjects, error: subjectsError }] = await Promise.all([
    supabase.from('user_profiles').select('education_level, subject_interests, onboarding_completed, enrolled_courses').eq('user_id', user.id).maybeSingle(),
    supabase.from('academic_contexts').select('pathway, institution, programme, year_level, semester, courses').eq('user_id', user.id).maybeSingle(),
    supabase.from('subjects').select('name').eq('user_id', user.id),
  ]);

  if (profileError) throw profileError;
  if (academicError) throw academicError;
  if (subjectsError) throw subjectsError;

  const metadata = user.user_metadata ?? {};
  const board = asBoard(metadata.board ?? metadata.exam_board ?? metadata.curriculum_board);
  const stage = asStage(metadata.stage ?? profile?.education_level ?? academic?.pathway);
  const qualification = typeof metadata.qualification === 'string' ? metadata.qualification : academic?.programme ?? undefined;
  const syllabusCode = typeof metadata.syllabus_code === 'string' ? metadata.syllabus_code : undefined;
  const syllabusYear = typeof metadata.syllabus_year === 'string' ? metadata.syllabus_year : undefined;
  const enrolledSubjects = [...new Set([
    ...(subjects ?? []).map(row => row.name),
    ...cleanArray(profile?.subject_interests),
    ...cleanArray(profile?.enrolled_courses),
    ...cleanArray(academic?.courses),
  ])];

  if (!stage || !board || !qualification || !enrolledSubjects.length || !profile?.onboarding_completed) {
    throw new Error('ACADEMIC_CONTEXT_INCOMPLETE');
  }

  return {
    userId: user.id,
    displayName: typeof metadata.display_name === 'string' ? metadata.display_name : undefined,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined,
    stage,
    board,
    qualification,
    syllabusCode,
    syllabusYear,
    schoolName: academic?.institution ?? undefined,
    subjects: enrolledSubjects,
    timezone: typeof metadata.timezone === 'string' ? metadata.timezone : undefined,
    locale: typeof metadata.locale === 'string' ? metadata.locale : undefined,
    onboardingComplete: true,
  };
}
