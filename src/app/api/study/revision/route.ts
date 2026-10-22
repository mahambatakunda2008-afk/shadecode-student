// src/app/api/study/revision/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { buildRevisionDeck, isRevisionRating, RATING_EVIDENCE, type OutcomeRow } from '@/lib/study/revisionDeck'
import { rollUpSubsectionMastery } from '@/lib/study/subsectionMastery'
import { recordKeyedMastery, type MasteryClient } from '@/lib/topicMastery/record'
import { recordSignalsServer } from '@/lib/learning/server'
import { assertRequestedLearnerSubject, resolveLearnerSubjects } from '@/lib/subjects/resolveLearnerSubjects'

export const dynamic = 'force-dynamic'

const SYLLABUS = /^cambridge-(9700|9701|9702|9709)$/
const TOPIC_KEY = /^\d{1,2}\.\d{1,2}$/
const SUBJECT_NAMES: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', mathematics: 'Mathematics' }

/**
 * GET                          -> every verified syllabus with its subsections and the learner's mastery per subsection
 * GET ?syllabus=..&topic=..    -> a retrieval-practice deck for one subsection
 *
 * No model is involved: decks are built from the verified syllabus outcomes, so this never fails on provider outages.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const params = new URL(request.url).searchParams
    const syllabus = params.get('syllabus')
    const topic = params.get('topic')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to access revision material' }, { status: 401 })

    const learner = await resolveLearnerSubjects(supabase as never, user.id)
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: 'Choose your subjects before using revision', code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 })
    }
    const { data: syllabusRows, error: syllabusError } = await supabase.from('syllabi').select('id, subject')
    if (syllabusError) throw syllabusError
    const allowedSyllabusIds = (syllabusRows ?? [])
      .filter((row) => Boolean(assertRequestedLearnerSubject(learner.subjects, row.subject)))
      .map((row) => row.id as string)

    if (syllabus && topic) {
      if (!SYLLABUS.test(syllabus) || !TOPIC_KEY.test(topic)) return NextResponse.json({ error: 'Unknown syllabus or topic' }, { status: 400 })
      if (!allowedSyllabusIds.includes(syllabus)) {
        return NextResponse.json({ error: 'That syllabus is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
      }
      const { data, error } = await supabase
        .from('curriculum_knowledge')
        .select('knowledge_key, topic_key, title, content, objective_keys, level')
        .eq('syllabus_id', syllabus)
        .eq('topic_key', topic)
        .eq('kind', 'learning_outcome')
        .eq('status', 'verified')
      if (error) throw error
      const cards = buildRevisionDeck((data ?? []) as OutcomeRow[], { topicKey: topic, limit: 40 })
      if (!cards.length) return NextResponse.json({ error: 'No verified outcomes for this topic' }, { status: 404 })
      return NextResponse.json({ syllabusId: syllabus, topicKey: topic, topicTitle: cards[0].topicTitle, cards })
    }

    const { data: units, error } = await supabase.from('curriculum_topic_units').select('syllabus_id, subject_id, topic_key, title, level')
    if (error) throw error
    const visibleUnits = (units ?? []).filter((unit) => allowedSyllabusIds.includes(unit.syllabus_id))

    const { data: mastery } = await supabase.from('topic_mastery').select('syllabus_id, curriculum_topic_key, mastery_score').eq('user_id', user.id).not('curriculum_topic_key', 'is', null)
    const visibleMastery = (mastery ?? []).filter((row) => allowedSyllabusIds.includes(row.syllabus_id))

    return NextResponse.json({ syllabi: rollUpSubsectionMastery(visibleUnits, visibleMastery) })
  } catch (error) {
    console.error('[study/revision GET]', error)
    return NextResponse.json({ error: 'Could not load revision material. Please try again.', retryable: true }, { status: 500 })
  }
}

/** Records a self-rating for a subsection and feeds it into mastery (softer evidence than an exam). */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to save your progress' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const syllabusId: unknown = body?.syllabus_id
    const topicKey: unknown = body?.topic_key
    const rating: unknown = body?.rating
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to save your revision progress' }, { status: 401 })
    const learner = await resolveLearnerSubjects(supabase as never, user.id)
    if (learner.subjects.length === 0) return NextResponse.json({ error: 'Choose your subjects before saving revision progress', code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 })
    if (typeof syllabusId !== 'string' || !SYLLABUS.test(syllabusId)) return NextResponse.json({ error: 'Unknown syllabus' }, { status: 400 })
    const { data: syllabusRow, error: syllabusError } = await supabase.from('syllabi').select('id, subject').eq('id', syllabusId).maybeSingle()
    if (syllabusError) throw syllabusError
    if (!syllabusRow) return NextResponse.json({ error: 'Unknown syllabus' }, { status: 404 })
    if (!assertRequestedLearnerSubject(learner.subjects, syllabusRow.subject)) {
      return NextResponse.json({ error: 'That syllabus is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }
    if (typeof syllabusId !== 'string' || !SYLLABUS.test(syllabusId) || typeof topicKey !== 'string' || !TOPIC_KEY.test(topicKey) || !isRevisionRating(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    const { data: unit } = await supabase
      .from('curriculum_topic_units')
      .select('subject_id, title')
      .eq('syllabus_id', syllabusId)
      .eq('topic_key', topicKey)
      .maybeSingle()
    const subject = unit ? SUBJECT_NAMES[unit.subject_id] : null
    if (!unit || !subject) return NextResponse.json({ error: 'Unknown topic' }, { status: 404 })

    const { evidence, verdict } = RATING_EVIDENCE[rating]
    const { mastery } = await recordKeyedMastery(supabase as unknown as MasteryClient, user.id, {
      subject,
      topic: unit.title,
      syllabusId,
      topicKey,
      verdict,
      evidence,
      queueSource: 'syllabus_selfcheck',
    })

    await recordSignalsServer(supabase, user.id, [{
      kind: 'deck',
      source: 'deck',
      item_key: null,
      syllabus_id: syllabusId,
      topic_key: topicKey,
      correct: null,
      score: evidence,
      mistake_id: null,
      time_spent_seconds: null,
      props: { rating },
    }])

    return NextResponse.json({ ok: true, mastery })
  } catch (error) {
    console.error('[study/revision POST]', error)
    return NextResponse.json({ error: 'Could not save your rating. Please try again.', retryable: true }, { status: 500 })
  }
}
