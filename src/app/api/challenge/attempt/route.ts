// src/app/api/challenge/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { validateAttempt } from '@/lib/challenge/attempt'
import { gradeForPercentage } from '@/lib/challenge/fromResult'

export const dynamic = "force-dynamic";

/**
 * Legacy/self-reported attempts are telemetry only. A browser-supplied score
 * cannot prove a win. Verified challenges must use /api/challenge/mark, which
 * calculates the result against the private server-side answer key.
 */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to submit a challenge attempt' }, { status: 401 })

    const attempt = validateAttempt(await request.json())
    if (!attempt) return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })

    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, challenger_id')
      .eq('id', attempt.challengeId)
      .maybeSingle()
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

    const { data: frozen } = await supabase
      .from('challenge_questions')
      .select('marking')
      .eq('challenge_id', attempt.challengeId)
      .maybeSingle()

    if (frozen?.marking === 'server') {
      return NextResponse.json({
        error: 'This challenge requires server-side marking. Submit your answers through the verified marking flow.',
        code: 'SERVER_MARKING_REQUIRED',
      }, { status: 409 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle()

    // Keep legacy client-marked scores for diagnostics only. Never let an
    // unverified client score create a win or enter verified rankings.
    const { error } = await supabase
      .from('challenge_attempts')
      .insert({
        challenge_id: attempt.challengeId,
        user_id: user.id,
        user_name: profile?.username ?? profile?.display_name ?? null,
        percentage: attempt.percentage,
        total_score: attempt.totalScore,
        max_score: attempt.maxScore,
        time_taken: attempt.timeTaken ?? 0,
        grade: attempt.grade ?? gradeForPercentage(attempt.percentage),
        won: false,
        verified: false,
      })

    if (error) {
      console.error('[challenge/attempt POST]', error)
      return NextResponse.json({ error: 'Could not record unverified attempt' }, { status: 500 })
    }

    return NextResponse.json({
      won: false,
      verified: false,
      message: 'Attempt saved as unverified. This score cannot count as a challenge win.',
    })
  } catch (err) {
    console.error('[challenge/attempt POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
