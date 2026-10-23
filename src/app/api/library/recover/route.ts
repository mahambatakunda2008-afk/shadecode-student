// src/app/api/library/recover/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedRequestClient } from '@/lib/supabase/authenticated-request'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { loadLibrary } from '@/lib/library/store'
import { recoverLesson } from '@/lib/library/recover'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'

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
    const auth = await createAuthenticatedRequestClient(request)
    if (!auth) return NextResponse.json({ error: 'Sign in to recover a lesson for your subjects' }, { status: 401 })
    const { supabase, user } = auth

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, subject)
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
    }

    const library = await loadLibrary(supabase as never)
    const row = recoverLesson(library.index, library.rows, subjectAccess.subject, topic)
    if (!row) return NextResponse.json({ error: 'No library lesson covers this topic' }, { status: 404 })
    return NextResponse.json({ lesson: { id: row.id, title: row.title, blocks: row.blocks } })
  } catch (error) {
    console.error('[library/recover]', error)
    return NextResponse.json({ error: 'The library is unavailable', retryable: true }, { status: 503 })
  }
}
