// src/app/api/library/recover/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { loadLibrary } from '@/lib/library/store'
import { recoverLesson } from '@/lib/library/recover'
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects'

export const dynamic = 'force-dynamic'

/**
 * A stand-in lesson for when lesson generation fails: the library lesson whose title or topic covers the
 * request, or 404. No model involved, and deliberately strict: no lesson is better than the wrong lesson.
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
    if (authError || !user) return NextResponse.json({ error: 'Sign in to recover lessons' }, { status: 401 })

    const learner = await resolveLearnerSubjects(supabase as never, user.id)
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: 'Choose your subjects in onboarding before recovering lessons', code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 })
    }
    if (!assertRequestedLearnerSubject(learner.subjects, subject)) {
      return NextResponse.json({ error: 'That subject is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }

    const library = await loadLibrary(supabase as never)
    const row = recoverLesson(library.index, library.rows, subject, topic)
    if (!row) return NextResponse.json({ error: 'No library lesson covers this topic' }, { status: 404 })
    return NextResponse.json({ lesson: { id: row.id, title: row.title, blocks: row.blocks } })
  } catch (error) {
    console.error('[library/recover]', error)
    return NextResponse.json({ error: 'The library is unavailable', retryable: true }, { status: 503 })
  }
}
