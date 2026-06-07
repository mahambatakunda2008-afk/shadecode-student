'use server';

import { cookies } from 'next/headers';
import type { OnboardingFormData } from '@/types/onboarding';

// ── Uncomment your adapter ────────────────────────────────────────────────────
// import { getServerSession } from 'next-auth';
// import { authOptions }      from '@/lib/auth';
// import { prisma }           from '@/lib/prisma';

// ── Supabase ──────────────────────────────────────────────────────────────────
// import { createServerActionClient } from '@supabase/auth-helpers-nextjs';

// ── Clerk ─────────────────────────────────────────────────────────────────────
// import { auth } from '@clerk/nextjs/server';

// ─────────────────────────────────────────────────────────────────────────────

export async function completeOnboarding(data: OnboardingFormData): Promise<void> {

  // ── 1. Resolve authenticated userId ────────────────────────────────────────

  // NextAuth:
  // const session = await getServerSession(authOptions);
  // if (!session?.user?.id) throw new Error('Unauthenticated');
  // const userId = session.user.id;

  // Clerk:
  // const { userId } = auth();
  // if (!userId) throw new Error('Unauthenticated');

  // Supabase:
  // const supabase = createServerActionClient({ cookies });
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session?.user) throw new Error('Unauthenticated');
  // const userId = session.user.id;

  // STUB:
  const userId = 'REPLACE_WITH_REAL_USER_ID';

  // ── 2. Upsert UserProfile ───────────────────────────────────────────────────

  // Prisma:
  // await prisma.userProfile.upsert({
  //   where:  { userId },
  //   update: {
  //     displayName:         data.displayName,
  //     studyLevel:          data.studyLevel,
  //     subjects:            data.subjects,
  //     dailyGoalMinutes:    data.dailyGoalMinutes,
  //     studyStyle:          data.studyStyle,
  //     onboardingCompleted: true,
  //     tourCompleted:       false,
  //   },
  //   create: {
  //     userId,
  //     displayName:         data.displayName,
  //     studyLevel:          data.studyLevel,
  //     subjects:            data.subjects,
  //     dailyGoalMinutes:    data.dailyGoalMinutes,
  //     studyStyle:          data.studyStyle,
  //     onboardingCompleted: true,
  //     tourCompleted:       false,
  //   },
  // });

  // Supabase:
  // await supabase.from('profiles').upsert({
  //   id:                   userId,
  //   display_name:         data.displayName,
  //   study_level:          data.studyLevel,
  //   subjects:             data.subjects,
  //   daily_goal_minutes:   data.dailyGoalMinutes,
  //   study_style:          data.studyStyle,
  //   onboarding_completed: true,
  //   tour_completed:       false,
  // });

  // ── 3. Seed initial LearningPath ────────────────────────────────────────────

  // Prisma:
  // await prisma.learningPath.create({
  //   data: {
  //     userId,
  //     subjects: data.subjects,
  //     level:    data.studyLevel,
  //   },
  // });

  // Supabase:
  // await supabase.from('learning_paths').insert({
  //   user_id:  userId,
  //   subjects: data.subjects,
  //   level:    data.studyLevel,
  // });

  // ── 4. Set edge-readable cookie so middleware never re-routes this user ─────

  const jar = await cookies();
  jar.set('onboarding_complete', '1', {
    path:     '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 365,
    secure:   process.env.NODE_ENV === 'production',
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function completeTour(): Promise<void> {
  try {
    // NextAuth + Prisma:
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) return;
    // await prisma.userProfile.update({
    //   where: { userId: session.user.id },
    //   data:  { tourCompleted: true },
    // });

    // Supabase:
    // const supabase = createServerActionClient({ cookies });
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session?.user) return;
    // await supabase.from('profiles')
    //   .update({ tour_completed: true })
    //   .eq('id', session.user.id);

    // Clerk + Prisma:
    // const { userId } = auth();
    // if (!userId) return;
    // await prisma.userProfile.update({
    //   where: { userId },
    //   data:  { tourCompleted: true },
    // });
  } catch {
    // Never throw — tour completion must not crash the UI
  }
}
