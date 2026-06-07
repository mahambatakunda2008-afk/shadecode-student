import { redirect }       from 'next/navigation';
import { cookies }        from 'next/headers';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

/**
 * /onboarding
 *
 * Server-renders the guard check before any client JS loads.
 * Already-onboarded users are redirected before they see any flash.
 */
export default async function OnboardingPage() {
  const jar = await cookies();
  if (jar.get('onboarding_complete')?.value === '1') redirect('/dashboard');

  return <OnboardingFlow />;
}
