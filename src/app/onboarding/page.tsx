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
  
  // Check if onboarding is complete
  if (jar.get('onboarding_complete')?.value === '1') {
    console.log('[OnboardingPage] User already completed onboarding, redirecting to dashboard');
    redirect('/dashboard');
  }

  // Log onboarding page access for debugging
  console.log('[OnboardingPage] User accessing onboarding page');
  
  return <OnboardingFlow />;
}
