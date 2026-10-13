// src/app/api/library/recover/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { loadLibrary } from '@/lib/library/store'
import { recoverLesson } from '@/lib/library/recover'

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
  if (topic.length < 2) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  try {
    const supabase = await createSupabaseServerClient()
    const library = await loadLibrary(supabase as never)
    const row = recoverLesson(library.index, library.rows, subject, topic)
    if (!row) return NextResponse.json({ error: 'No library lesson covers this topic' }, { status: 404 })
    return NextResponse.json({ lesson: { id: row.id, title: row.title, blocks: row.blocks } })
  } catch (error) {
    console.error('[library/recover]', error)
    return NextResponse.json({ error: 'The library is unavailable', retryable: true }, { status: 503 })
  }
}
