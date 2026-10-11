// src/app/api/learn/paper/[sessionId]/practice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { checkPracticeAnswer, newPracticeQuestion } from '@/lib/learn/enginePractice'
import { freshSeed } from '@/lib/exam/engine/rng'
import { recordKeyedMastery, type MasteryClient } from '@/lib/topicMastery/record'

export const dynamic = 'force-dynamic'

type PlanBlock = { id?: string; curriculum?: { syllabusId?: string; topicKey?: string; title?: string }; interaction?: { evaluationMode?: string } }

/**
 * Model-free practice for a self-check checkpoint. The question is rebuilt from
 * the seed on every call, so the browser never holds the answer.
 *   { blockId, action: 'new' }                      -> a fresh question and its seed
 *   { blockId, action: 'check', seed, answer }      -> marks it exactly, records mastery under the exact subsection key
 */
export async function POST(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to practise' }, { status: 401 })

    const { sessionId } = await context.params
    const body = await request.json().catch(() => null)
    const blockId = typeof body?.blockId === 'string' ? body.blockId.slice(0, 80) : ''
    const action = body?.action
    if (!blockId || (action !== 'new' && action !== 'check')) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { data: session } = await supabase
      .from('paper_learning_sessions')
      .select('learning_plan')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    const plan = (session?.learning_plan ?? null) as { subject?: string; blocks?: PlanBlock[] } | null
    const block = plan?.blocks?.find((candidate) => candidate.id === blockId)
    const curriculum = block?.curriculum
    const subject = plan?.subject
    if (!block || block.interaction?.evaluationMode !== 'self_check' || !curriculum?.title || !curriculum.syllabusId || !curriculum.topicKey || !subject) {
      return NextResponse.json({ error: 'No practice question is available for this checkpoint', code: 'NO_PRACTICE' }, { status: 404 })
    }

    if (action === 'new') {
      const question = newPracticeQuestion(subject, curriculum.title, freshSeed())
      if (!question) return NextResponse.json({ error: 'No practice question is available for this topic yet', code: 'NO_PRACTICE' }, { status: 404 })
      return NextResponse.json(question)
    }

    const answer = typeof body?.answer === 'string' ? body.answer : ''
    if (!answer.trim()) return NextResponse.json({ error: 'Enter your answer first' }, { status: 400 })
    const checked = checkPracticeAnswer(subject, curriculum.title, body?.seed, answer)
    if (!checked) return NextResponse.json({ error: 'That practice question is no longer valid. Try a new one.', code: 'NO_PRACTICE' }, { status: 404 })

    let mastery: number | null = null
    try {
      mastery = (await recordKeyedMastery(supabase as unknown as MasteryClient, user.id, {
        subject,
        topic: curriculum.title,
        syllabusId: curriculum.syllabusId,
        topicKey: curriculum.topicKey,
        verdict: checked.correct ? 'correct' : 'incorrect',
        queueSource: 'paper_learning',
      })).mastery
    } catch (error) {
      console.error('[paper practice mastery]', error)
    }

    return NextResponse.json({ ...checked, mastery })
  } catch (error) {
    console.error('[paper practice]', error)
    return NextResponse.json({ error: 'Practice is unavailable right now. Please try again.', retryable: true }, { status: 500 })
  }
}
