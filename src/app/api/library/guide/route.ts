// src/app/api/library/guide/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { resolveVerifiedCurriculumPromptContext } from '@/lib/curriculum/ai-grounding'
import { assertRequestedLearnerSubject, resolveLearnerSubjects } from '@/lib/subjects/resolveLearnerSubjects'
import { buildSyllabusGuide, type GuideKnowledgeItem } from '@/lib/cortex/syllabusGuide'

export const dynamic = 'force-dynamic'

/**
 * AI-free recovery lesson: when every AI provider is down, build a syllabus study guide for the learner's
 * own verified syllabus. Built only from official learning outcomes (no model, no invented content), and
 * 404 when the syllabus gives too little for an honest guide.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  const params = new URL(request.url).searchParams
  const subject = (params.get('subject') ?? '').trim().slice(0, 60)
  const topic = (params.get('topic') ?? '').trim().slice(0, 200)
  if (topic.length < 2) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to use a syllabus guide' }, { status: 401 })

    if (!subject) return NextResponse.json({ error: 'Choose one of your selected subjects' }, { status: 400 })

    const learner = await resolveLearnerSubjects(supabase, user.id)
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: 'Choose your subjects in onboarding before using a syllabus guide', code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 })
    }
    if (!assertRequestedLearnerSubject(learner.subjects, subject)) {
      return NextResponse.json({ error: 'That subject is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }

    // Same prompt shape the lesson generator uses, but only after canonical onboarding access is verified.
    const resolved = await resolveVerifiedCurriculumPromptContext(user.id, `${subject}\\nmaster this request: "${topic}"`)
    if (resolved.status !== 'resolved' || !resolved.pack) {
      return NextResponse.json({ error: 'No verified syllabus is available for this topic' }, { status: 404 })
    }
    const { pack } = resolved
    const normalizedPackSubject = (pack.subject || '').trim().replace(/^(as|a)[ -]?level\s+/i, '').toLowerCase()
    if (normalizedPackSubject !== subject.toLowerCase()) {
      return NextResponse.json({ error: 'The curriculum profile does not match your selected subject', code: 'CURRICULUM_SUBJECT_MISMATCH' }, { status: 409 })
    }

    const topicItems: GuideKnowledgeItem[] = pack.knowledge.map((item) => ({
      kind: item.kind, code: item.code, title: item.title, content: item.content, topicCode: item.topicCode,
    }))
    const matchedTopicCodes = [...new Set(topicItems.map((item) => item.topicCode).filter((code): code is string => Boolean(code)))]
    if (!matchedTopicCodes.length) {
      return NextResponse.json({ error: 'This topic did not match a syllabus subsection' }, { status: 404 })
    }

    // Widen to the rest of the syllabus chapter so a narrow topic still yields a useful guide.
    let items = topicItems
    const admin = createSupabaseAdminClient()
    if (admin && pack.curriculumId) {
      const { data, error } = await admin
        .from('curriculum_knowledge')
        .select('kind,knowledge_key,title,content,topic_key')
        .eq('curriculum_version_id', pack.curriculumId)
        .in('kind', ['content_scope', 'learning_outcome'])
        .limit(2000)
      if (!error && data?.length) {
        items = data.map((row) => ({ kind: row.kind, code: row.knowledge_key, title: row.title, content: row.content, topicCode: row.topic_key }))
      }
    }

    const guide = buildSyllabusGuide({ subject: pack.subject || subject, topic: resolved.resolvedTopic || topic, matchedTopicCodes, items })
    if (!guide) return NextResponse.json({ error: 'Not enough syllabus detail for an honest guide on this topic' }, { status: 404 })

    return NextResponse.json({ lesson: { title: guide.title, blocks: guide.blocks, source: 'syllabus-guide' } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[library/guide]', error)
    return NextResponse.json({ error: 'The syllabus guide is unavailable', retryable: true }, { status: 503 })
  }
}
