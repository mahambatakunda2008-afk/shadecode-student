'use server';

import { cookies } from 'next/headers';
import type { OnboardingFormData } from '@/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapOnboardingFormData } from '@/lib/onboarding/mapFormData';
import { initializeLearningPath } from '@/lib/learning-path';

const ONBOARDING_COOKIE = 'onboarding_complete';
const ONBOARDING_COOKIE_OPTIONS = {
  path:     '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 365,
  secure:   process.env.NODE_ENV === 'production',
};

/**
 * Server-action variant of the onboarding completion flow. Mirrors
 * /api/onboarding/complete: persists the canonical profile + learning path and
 * sets the edge-readable cookie that the middleware and server guards check.
 */
export async function completeOnboarding(data: OnboardingFormData): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthenticated');
  }

  const { education_level, learning_goal, subject_interests } =
    mapOnboardingFormData(data);

  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      education_level,
      learning_goal,
      subject_interests,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const learningPathData = initializeLearningPath(
    user.id,
    education_level,
    learning_goal,
    subject_interests
  );

  const { error: pathError } = await supabase.from('learning_paths').upsert(
    { ...learningPathData, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  if (pathError) {
    throw new Error(pathError.message);
  }

  const jar = await cookies();
  jar.set(ONBOARDING_COOKIE, '1', ONBOARDING_COOKIE_OPTIONS);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Best-effort tour completion flag. localStorage is the primary guard on the
 * client (see TourContext), so this never throws.
 */
export async function completeTour(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_profiles')
      .update({ tour_completed: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  } catch {
    // Never throw — tour completion must not crash the UI.
  }
}
