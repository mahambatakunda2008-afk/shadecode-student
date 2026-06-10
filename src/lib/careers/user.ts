import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listUserCareers(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('user_careers').select('career_id, careers(*)').eq('user_id', userId);
  return (data ?? []).map((r: any) => r.careers);
}

export async function isFollowingCareer(userId: string, careerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('user_careers').select('*').eq('user_id', userId).eq('career_id', careerId).maybeSingle();
  return !!data;
}

export async function followCareer(userId: string, careerId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from('user_careers').insert({ user_id: userId, career_id: careerId }).select('id').maybeSingle();
  return true;
}

export async function unfollowCareer(userId: string, careerId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from('user_careers').delete().eq('user_id', userId).eq('career_id', careerId);
  return true;
}
