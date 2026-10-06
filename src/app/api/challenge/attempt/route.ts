// src/app/api/challenge/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { didWin, validateAttempt } from '@/lib/challenge/attempt'

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const attempt = validateAttempt(await request.json())
    if (!attempt) return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })

    // The challenger's score comes from the stored challenge, never from the client.
    const { data: challenge } = await supabase
      .from('challenges')
      .select('percentage')
      .eq('id', attempt.challengeId)
      .maybeSingle()
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

    let user_name: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()
      user_name = profile?.username ?? profile?.display_name ?? null
    }

    const won = didWin(attempt.percentage, Number(challenge.percentage))

    const { error } = await supabase
      .from('challenge_attempts')
      .insert({
        challenge_id: attempt.challengeId,
        user_id:     user?.id ?? null,
        user_name,
        percentage:  attempt.percentage,
        total_score: attempt.totalScore,
        max_score:   attempt.maxScore,
        time_taken:  attempt.timeTaken,
        grade:       attempt.grade,
        won,
      })

    if (error) console.error('[challenge/attempt POST]', error)
    // Non-fatal — return result regardless
    return NextResponse.json({ won })
  } catch (err) {
    console.error('[challenge/attempt POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
