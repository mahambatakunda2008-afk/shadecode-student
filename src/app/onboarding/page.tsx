import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * /onboarding
 *
 * Server-renders the guard check before any client JS loads.
 * Completion is read from the authenticated profile, not a client-controlled
 * cookie, so a user cannot forge the onboarding state by editing browser data.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.onboarding_completed === true) {
      redirect('/dashboard');
    }
  }

  return <OnboardingFlow />;
}
