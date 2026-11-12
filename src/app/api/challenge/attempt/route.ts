// src/app/api/challenge/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { didWin, validateAttempt } from '@/lib/challenge/attempt'
import { gradeForPercentage } from '@/lib/challenge/fromResult'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'
import { checkAccountDeletionWriteGate, createSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordBattleAttempt } from '@/lib/challenge/recordAttempt'

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to submit a challenge attempt' }, { status: 401 })

    const attempt = validateAttempt(await request.json())
    if (!attempt) return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })

    // The challenger's score comes from the stored challenge, never from the client.
    const { data: challenge } = await supabase
      .from('challenges')
      .select('percentage, subject')
      .eq('id', attempt.challengeId)
      .maybeSingle()
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    if (typeof challenge.subject !== 'string' || !challenge.subject.trim()) {
      return NextResponse.json({ error: 'Challenge subject could not be verified', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }
    const subjectAccess = await resolveLearnerSubject(supabase, user.id, challenge.subject)
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()
    const user_name = profile?.username ?? profile?.display_name ?? null

    const won = didWin(attempt.percentage, Number(challenge.percentage))

    // Self-reported papers are recorded unverified; only the service role may write attempts.
    const admin = createSupabaseAdminClient()
    if (!admin) return NextResponse.json({ error: 'Challenge recording is temporarily unavailable.' }, { status: 503 })
    const deletionGate = await checkAccountDeletionWriteGate(admin, user.id)
    if (!deletionGate.allowed) {
      return NextResponse.json({ error: deletionGate.message, code: deletionGate.code }, { status: deletionGate.status })
    }
    const saved = await recordBattleAttempt(admin, {
      challengeId: attempt.challengeId,
      userId: user.id,
      userName: user_name,
      percentage: attempt.percentage,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      timeTaken: attempt.timeTaken ?? 0,
      grade: attempt.grade ?? gradeForPercentage(attempt.percentage),
      won,
      verified: false,
    })

    if (!saved.ok) console.error('[challenge/attempt POST] attempt not recorded')
    // Non-fatal — return result regardless
    return NextResponse.json({ won })
  } catch (err) {
    console.error('[challenge/attempt POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
