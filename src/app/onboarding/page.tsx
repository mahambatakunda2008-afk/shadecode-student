import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * /onboarding
 *
 * Server-renders the guard check before any client JS loads.
 * Completion is read from the authenticated `user_profiles` record, not a
 * client-controlled cookie, so browser state cannot bypass the server guard.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.onboarding_completed === true) {
      redirect('/dashboard');
    }
  }

  return <OnboardingFlow />;
}
