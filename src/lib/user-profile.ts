/**
 * lib/user-profile.ts
 * ────────────────────
 * Server-side helper — safely fetches the current user's profile flags.
 * Returns null when unauthenticated or profile doesn't exist yet.
 *
 * Used by the dashboard layout to pass onboardingCompleted / tourCompleted
 * to TourProvider so the tour auto-starts for brand-new users.
 */

// ── Prisma + NextAuth ─────────────────────────────────────────────────────────
// import { getServerSession } from 'next-auth';
// import { authOptions }      from '@/lib/auth';
// import { prisma }           from '@/lib/prisma';

// ── Prisma + Clerk ────────────────────────────────────────────────────────────
// import { auth } from '@clerk/nextjs/server';
// import { prisma } from '@/lib/prisma';

// ── Supabase ──────────────────────────────────────────────────────────────────
// import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';

export interface UserProfileFlags {
  userId:               string;
  displayName:          string;
  onboardingCompleted:  boolean;
  tourCompleted:        boolean;
}

export async function getUserProfileFlags(): Promise<UserProfileFlags | null> {
  try {

    // ── NextAuth + Prisma ───────────────────────────────────────────────────
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) return null;
    //
    // const profile = await prisma.userProfile.findUnique({
    //   where:  { userId: session.user.id },
    //   select: {
    //     userId:              true,
    //     displayName:         true,
    //     onboardingCompleted: true,
    //     tourCompleted:       true,
    //   },
    // });
    // return profile;

    // ── Clerk + Prisma ──────────────────────────────────────────────────────
    // const { userId } = auth();
    // if (!userId) return null;
    //
    // const profile = await prisma.userProfile.findUnique({
    //   where:  { userId },
    //   select: { userId: true, displayName: true, onboardingCompleted: true, tourCompleted: true },
    // });
    // return profile;

    // ── Supabase ─────────────────────────────────────────────────────────────
    // const supabase = createServerComponentClient({ cookies });
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session?.user) return null;
    //
    // const { data } = await supabase
    //   .from('profiles')
    //   .select('id, display_name, onboarding_completed, tour_completed')
    //   .eq('id', session.user.id)
    //   .single();
    //
    // if (!data) return null;
    // return {
    //   userId:              data.id,
    //   displayName:         data.display_name,
    //   onboardingCompleted: data.onboarding_completed,
    //   tourCompleted:       data.tour_completed,
    // };

    // ── STUB — replace with real adapter above ────────────────────────────────
    return null;

  } catch {
    return null;
  }
}
