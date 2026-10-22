// src/app/api/study/revision/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { buildRevisionDeck, isRevisionRating, RATING_EVIDENCE, type OutcomeRow } from '@/lib/study/revisionDeck'
import { rollUpSubsectionMastery } from '@/lib/study/subsectionMastery'
import { recordKeyedMastery, type MasteryClient } from '@/lib/topicMastery/record'
import { recordSignalsServer } from '@/lib/learning/server'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'

export const dynamic = 'force-dynamic'

const SYLLABUS = /^cambridge-(9700|9701|9702|9709)$/
const TOPIC_KEY = /^\d{1,2}\.\d{1,2}$/
const SUBJECT_NAMES: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', mathematics: 'Mathematics' }
const SYLLABUS_SUBJECTS: Record<string, string> = { 'cambridge-9700': 'Biology', 'cambridge-9701': 'Chemistry', 'cambridge-9702': 'Physics', 'cambridge-9709': 'Mathematics' }

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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to access revision material' }, { status: 401 })
    const params = new URL(request.url).searchParams
    const syllabus = params.get('syllabus')
    const topic = params.get('topic')

    if (syllabus && topic) {
      if (!SYLLABUS.test(syllabus) || !TOPIC_KEY.test(topic)) return NextResponse.json({ error: 'Unknown syllabus or topic' }, { status: 400 })
      const subjectAccess = await resolveLearnerSubject(supabase, user.id, SYLLABUS_SUBJECTS[syllabus])
      if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
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

    const { data: allUnits, error } = await supabase.from('curriculum_topic_units').select('syllabus_id, subject_id, topic_key, title, level')
    if (error) throw error

    const eligibleSubjects = new Set<string>()
    for (const [syllabusId, subjectName] of Object.entries(SYLLABUS_SUBJECTS)) {
      const access = await resolveLearnerSubject(supabase, user.id, subjectName)
      if (access.ok) eligibleSubjects.add(syllabusId)
    }
    if (!eligibleSubjects.size) return NextResponse.json({ syllabi: [] })
    const units = (allUnits ?? []).filter((unit) => eligibleSubjects.has(unit.syllabus_id))
    const { data: mastery } = await supabase.from('topic_mastery').select('syllabus_id, curriculum_topic_key, mastery_score').eq('user_id', user.id).in('syllabus_id', [...eligibleSubjects]).not('curriculum_topic_key', 'is', null)

    return NextResponse.json({ syllabi: rollUpSubsectionMastery(units, mastery ?? []) })
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
    if (typeof syllabusId !== 'string' || !SYLLABUS.test(syllabusId) || typeof topicKey !== 'string' || !TOPIC_KEY.test(topicKey) || !isRevisionRating(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, SYLLABUS_SUBJECTS[syllabusId])
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })

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
