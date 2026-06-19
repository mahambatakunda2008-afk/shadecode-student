import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function listCareers() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from('careers').select('id, slug, title, description, salary_low, salary_high').order('title', { ascending: true });
  return data ?? [];
}

export async function getCareerBySlug(slug: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data: career } = await supabase.from('careers').select('*').eq('slug', slug).maybeSingle();
  if (!career) return null;
  const { data: skills } = await supabase.from('career_skills').select('skill_id, importance, skills(name, description)').eq('career_id', career.id).order('importance', { ascending: false });
  const { data: recCourses } = await supabase.from('career_recommended_courses').select('subject_id, note').eq('career_id', career.id);

  const subjectIds = (recCourses ?? []).map((r: any) => r.subject_id).filter(Boolean);
  let subjects: any[] = [];
  if (subjectIds.length > 0) {
    const { data: subs } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
    subjects = subs ?? [];
  }

  return { career, skills: skills ?? [], recommendedCourses: recCourses ?? [], subjects };
}
