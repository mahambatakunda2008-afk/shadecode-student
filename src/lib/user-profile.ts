import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Server-side helper for the dashboard tour gate.
 *
 * user_profiles is the canonical onboarding state store:
 * - onboarding_completed controls access to the dashboard experience.
 * - tour_completed controls whether the dashboard tour auto-starts.
 */
export interface UserProfileFlags {
  userId:              string;
  displayName:         string;
  onboardingCompleted: boolean;
  tourCompleted:       boolean;
}

export async function getUserProfileFlags(): Promise<UserProfileFlags | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, onboarding_completed, tour_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      userId:              data.user_id,
      displayName:         user.user_metadata?.username ?? user.email ?? '',
      onboardingCompleted: data.onboarding_completed === true,
      tourCompleted:       data.tour_completed === true,
    };
  } catch {
    return null;
  }
}
