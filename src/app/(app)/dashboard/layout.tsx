import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { TourProvider } from '@/context/TourContext';
import { ProductTour } from '@/components/tour/ProductTour';
import { getUserProfileFlags } from '@/lib/user-profile';

/**
 * Dashboard-specific layout.
 *
 * Authentication and onboarding access are enforced by the root app layout
 * and middleware. Do not add a second client/server cookie gate here: the
 * previous `onboarding_complete` cookie gate could disagree with the
 * canonical `user_profiles.onboarding_completed` value and create a
 * `/dashboard` <-> `/onboarding` redirect loop.
 *
 * This layout only loads the profile flags needed by the product tour.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await getUserProfileFlags();

  // Middleware normally guarantees this, but keep a defensive server-side
  // guard for direct/internal navigation and stale deployments.
  if (!profile) {
    redirect('/auth/login?error=profile_unavailable');
  }

  if (!profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  return (
    <TourProvider
      onboardingCompleted={profile.onboardingCompleted}
      tourCompleted={profile.tourCompleted}
    >
      {children}
      <ProductTour />
    </TourProvider>
  );
}
