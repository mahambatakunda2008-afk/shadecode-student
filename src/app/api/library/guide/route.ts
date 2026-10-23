// src/app/api/library/guide/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { resolveVerifiedCurriculumPromptContext } from '@/lib/curriculum/ai-grounding'
import { buildSyllabusGuide, type GuideKnowledgeItem } from '@/lib/cortex/syllabusGuide'
import { buildEnginePracticeBlocks, wrapPracticeLesson } from '@/lib/cortex/enginePractice'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'

export const dynamic = 'force-dynamic'


function respond(lesson: { title: string; blocks: unknown[] }) {
  return NextResponse.json({ lesson: { title: lesson.title, blocks: lesson.blocks, source: 'ai-free-recovery' } }, { headers: { 'Cache-Control': 'private, no-store' } })
}

async function tryBuildSyllabusGuide(input: { userId: string; subject: string; topic: string; extraBlocks?: Array<{ type: string; title: string; content: string }> }) {
  try {
    // Same prompt shape the lesson generator uses, so identity and topic resolution behave identically.
    const resolved = await resolveVerifiedCurriculumPromptContext(input.userId, `${input.subject}\nmaster this request: "${input.topic}"`)
    if (resolved.status !== 'resolved' || !resolved.pack) return null
    const { pack } = resolved

    const topicItems: GuideKnowledgeItem[] = pack.knowledge.map((item) => ({
      kind: item.kind, code: item.code, title: item.title, content: item.content, topicCode: item.topicCode,
    }))
    const matchedTopicCodes = [...new Set(topicItems.map((item) => item.topicCode).filter((code): code is string => Boolean(code)))]
    if (!matchedTopicCodes.length) return null

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
    return buildSyllabusGuide({ subject: pack.subject || input.subject, topic: resolved.resolvedTopic || input.topic, matchedTopicCodes, items, extraBlocks: input.extraBlocks })
  } catch (error) {
    console.error('[library/guide] syllabus guide unavailable', error)
    return null
  }
}

/**
 * AI-free recovery lesson: when every AI provider is down, build (1) a syllabus study guide from the learner's own
 * verified syllabus plus worked examples/practice from the question engine, or (2) engine practice alone when no
 * syllabus matches. No model, no invented content; 404 when there is not enough for an honest lesson.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  const params = new URL(request.url).searchParams
  const subject = (params.get('subject') ?? '').trim().slice(0, 60)
  const topic = (params.get('topic') ?? '').trim().slice(0, 200)
  if (!subject) return NextResponse.json({ error: 'subject required' }, { status: 400 })
  if (topic.length < 2) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to use a syllabus guide' }, { status: 401 })

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, subject)
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
    }
    const allowedSubject = subjectAccess.subject

    // Worked examples and practice from the question engine: independent of any syllabus data or AI provider.
    const practice = buildEnginePracticeBlocks(allowedSubject, topic)

    // Syllabus guide from the learner's verified syllabus, when one exists for this topic.
    const guide = await tryBuildSyllabusGuide({ userId: user.id, subject: allowedSubject, topic, extraBlocks: practice?.blocks })
    if (guide) return respond(guide)

    // No syllabus match (e.g. ZIMSEC, or no curriculum configured): a practice-only lesson still works.
    if (practice) return respond(wrapPracticeLesson(subject, topic, practice))

    return NextResponse.json({ error: 'Not enough syllabus detail or practice material for an honest lesson on this topic' }, { status: 404 })
  } catch (error) {
    console.error('[library/guide]', error)
    return NextResponse.json({ error: 'The syllabus guide is unavailable', retryable: true }, { status: 503 })
  }
}
