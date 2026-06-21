import type { ReactNode }      from 'react';
import { redirect }            from 'next/navigation';
import { cookies }             from 'next/headers';
import { TourProvider }        from '@/context/TourContext';
import { ProductTour }         from '@/components/tour/ProductTour';
import { getUserProfileFlags } from '@/lib/user-profile';

/**
 * app/(dashboard)/layout.tsx
 * ───────────────────────────
 * This is the critical connection point in the entire flow.
 *
 * What it does:
 *   1. Hard-guards: cookie check before any DB call (fast path)
 *   2. Fetches onboardingCompleted + tourCompleted from the DB
 *   3. Passes both flags to TourProvider
 *   4. TourProvider auto-starts the tour when:
 *        onboardingCompleted === true && tourCompleted === false
 *   5. ProductTour renders into a portal — invisible until the tour fires
 *
 * Data-tour targets
 * ─────────────────
 * Add these attributes to your dashboard components so the spotlight knows
 * which elements to highlight:
 *
 *   data-tour-target="dashboard-overview"   → main stats/welcome section
 *   data-tour-target="knowledge-units"      → KnowledgeUnit list/grid
 *   data-tour-target="adaptive-tutor"       → AI tutor widget/card
 *   data-tour-target="start-learning"       → primary CTA button
 *   data-tour-target="progress-tracking"    → progress bars / mastery section
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // ── Fast gate: cookie is set immediately by the server action ───────────────
  const jar = await cookies();
  if (jar.get('onboarding_complete')?.value !== '1') {
    redirect('/onboarding');
  }

  // ── DB flags — determines whether the tour should auto-start ───────────────
  const profile = await getUserProfileFlags();

  const onboardingCompleted = profile?.onboardingCompleted ?? false;
  const tourCompleted       = profile?.tourCompleted       ?? false;

  console.log({
    route: '/dashboard',
    profileExists: profile !== null,
    onboardingCompleted,
    tourCompleted,
    userId: profile?.userId,
  });

  return (
    <TourProvider
      onboardingCompleted={onboardingCompleted}
      tourCompleted={tourCompleted}
    >
      {children}

      {/*
        ProductTour is portal-rendered into document.body so it escapes
        every stacking context in the dashboard layout. Safe to mount here.
      */}
      <ProductTour />
    </TourProvider>
  );
}
