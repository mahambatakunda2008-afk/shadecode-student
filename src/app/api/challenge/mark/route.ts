// src/app/api/challenge/mark/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { sanitizeQuestions } from '@/lib/challenge/questions'
import { markAgainstKey, type KeyEntry } from '@/lib/challenge/serverMarking'
import { didWin } from '@/lib/challenge/attempt'
import { gradeForPercentage } from '@/lib/challenge/fromResult'
import type { ExamAnswer } from '@/lib/exam/types'

export const dynamic = 'force-dynamic'

const ID = /^[0-9a-f-]{8,64}$/i

/**
 * Marks a battle submission against the private answer key and records a
 * verified attempt. The browser only ever sends answers; it never holds the key
 * and never reports a score.
 */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to play this challenge' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const challengeId: unknown = body?.challenge_id
    if (typeof challengeId !== 'string' || !ID.test(challengeId) || !Array.isArray(body?.answers) || body.answers.length > 20) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    if (!admin) return NextResponse.json({ error: 'Marking is temporarily unavailable. Please try again.', retryable: true }, { status: 503 })

    const [{ data: challenge }, { data: frozen }, { data: keyRow }] = await Promise.all([
      supabase.from('challenges').select('percentage, challenger_id').eq('id', challengeId).maybeSingle(),
      supabase.from('challenge_questions').select('questions, marking').eq('challenge_id', challengeId).maybeSingle(),
      admin.from('challenge_answer_keys').select('key').eq('challenge_id', challengeId).maybeSingle(),
    ])
    const playSet = frozen ? sanitizeQuestions(frozen.questions) : null
    if (!challenge || !frozen || frozen.marking !== 'server' || !playSet || !keyRow) {
      return NextResponse.json({ error: 'This challenge is not available for server marking' }, { status: 404 })
    }

    const answers: ExamAnswer[] = body.answers
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: Record<string, unknown>) => ({ questionId: Number(item.questionId), answer: typeof item.answer === 'string' ? item.answer : '', timeSpent: Number(item.timeSpent) || 0 }))
      .filter((answer: ExamAnswer) => Number.isInteger(answer.questionId))

    const timeTaken = Math.max(0, Math.min(Math.round(Number(body.timeTaken) || 0), 24 * 60 * 60))
    const marked = markAgainstKey(playSet, keyRow.key as KeyEntry[], answers, timeTaken)
    if (!marked) return NextResponse.json({ error: 'This challenge could not be marked' }, { status: 422 })

    const percentage = Math.round(marked.percentage)
    const won = didWin(percentage, Number(challenge.percentage))

    // The challenger practising their own paper is marked but never recorded as a battle.
    if (user.id !== challenge.challenger_id) {
      const { data: profile } = await supabase.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle()
      const { error } = await supabase.from('challenge_attempts').insert({
        challenge_id: challengeId,
        user_id: user.id,
        user_name: profile?.username ?? profile?.display_name ?? 'A student',
        percentage,
        total_score: Math.round(marked.totalScore),
        max_score: Math.round(marked.maxScore),
        time_taken: timeTaken,
        grade: gradeForPercentage(percentage),
        won,
        verified: true,
      })
      if (error) console.error('[challenge/mark insert]', error)
    }

    return NextResponse.json({ ...marked, won, verified: true })
  } catch (error) {
    console.error('[challenge/mark]', error)
    return NextResponse.json({ error: 'Marking failed. Please try again.', retryable: true }, { status: 500 })
  }
}
