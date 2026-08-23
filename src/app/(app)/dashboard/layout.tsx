import type { ReactNode } from 'react';
import { TourProvider } from '@/context/TourContext';
import { ProductTour } from '@/components/tour/ProductTour';

/**
 * Dashboard presentation wrapper.
 *
 * Authentication and access control are handled by middleware and the
 * application shell. This layout must not perform Supabase queries on the
 * critical navigation path: a stalled profile query would keep Next.js'
 * loading UI visible even though the app itself is healthy.
 *
 * The tour has its own local fast-path and can be hydrated with authoritative
 * profile state later without blocking the dashboard render.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TourProvider onboardingCompleted={false} tourCompleted={true}>
      {children}
      <ProductTour />
    </TourProvider>
  );
}
