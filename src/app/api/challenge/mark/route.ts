// src/app/api/challenge/mark/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { sanitizeQuestions } from '@/lib/challenge/questions'
import { markAgainstKey, type KeyEntry } from '@/lib/challenge/serverMarking'
import { didWin } from '@/lib/challenge/attempt'
import { gradeForPercentage } from '@/lib/challenge/fromResult'
import { recordChallengeMarkSubmission } from '@/lib/challenge/recordAttempt'
import { signalsFromMarkedPaper } from '@/lib/learning/signals'
import type { ExamAnswer } from '@/lib/exam/types'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'

export const dynamic = 'force-dynamic'

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
    const submissionId: unknown = body?.submission_id
    if (typeof challengeId !== 'string' || !ID.test(challengeId) || typeof submissionId !== 'string' || !ID.test(submissionId) || !Array.isArray(body?.answers) || body.answers.length > 20) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    if (!admin) return NextResponse.json({ error: 'Marking is temporarily unavailable. Please try again.', retryable: true }, { status: 503 })

    const [{ data: challenge }, { data: frozen }, { data: keyRow }] = await Promise.all([
      supabase.from('challenges').select('percentage, challenger_id, subject').eq('id', challengeId).maybeSingle(),
      supabase.from('challenge_questions').select('questions, marking').eq('challenge_id', challengeId).maybeSingle(),
      admin.from('challenge_answer_keys').select('key').eq('challenge_id', challengeId).maybeSingle(),
    ])
    const playSet = frozen ? sanitizeQuestions(frozen.questions) : null
    if (!challenge || !frozen || frozen.marking !== 'server' || !playSet || !keyRow) {
      return NextResponse.json({ error: 'This challenge is not available for server marking' }, { status: 404 })
    }
    if (typeof challenge.subject !== 'string' || !challenge.subject.trim()) {
      return NextResponse.json({ error: 'Challenge subject could not be verified', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }
    const subjectAccess = await resolveLearnerSubject(supabase, user.id, challenge.subject)
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
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

    // Persist the result and (for opponents) the battle row in one database transaction.
    // The unique submission key makes concurrent retries return the first result.
    const { data: profile } = user.id !== challenge.challenger_id
      ? await supabase.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle()
      : { data: null };
    const keyById = new Map((keyRow.key as KeyEntry[]).map((entry) => [entry.id, entry]));
    const learningQuestions = playSet.map((question) => ({ ...question, ...keyById.get(question.id) }));
    const learningSignals = signalsFromMarkedPaper(learningQuestions as never, marked.results, 'battle');
    const saved = await recordChallengeMarkSubmission(admin, {
      challengeId,
      userId: user.id,
      submissionId,
      result: { ...marked, won, verified: true },
      signals: learningSignals,
      attempt: user.id === challenge.challenger_id ? null : {
        userName: profile?.username ?? profile?.display_name ?? 'A student',
        percentage,
        totalScore: Math.round(marked.totalScore),
        maxScore: Math.round(marked.maxScore),
        timeTaken,
        grade: gradeForPercentage(percentage),
        won,
        verified: true,
      },
    });
    if (!saved.ok || !saved.result) {
      return NextResponse.json({ error: 'Your marked result could not be saved. Please retry.', retryable: true }, { status: 503 });
    }

    // Result, battle row and learning signals were committed atomically by the RPC.
    return NextResponse.json(saved.result)
  } catch (error) {
    console.error('[challenge/mark]', error)
    return NextResponse.json({ error: 'Marking failed. Please try again.', retryable: true }, { status: 500 })
  }
}
