// src/app/api/library/vote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { resetLibraryCache } from '@/lib/library/store'
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects'

export const dynamic = 'force-dynamic'

/** One vote per learner per lesson; changing your mind updates it. The ranking learns from these. */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to rate lessons' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const id: unknown = body?.id
    const helpful: unknown = body?.helpful
    if (typeof id !== 'string' || !/^[0-9a-f-]{8,64}$/i.test(id) || typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('lesson_library')
      .select('id, subject')
      .eq('id', id)
      .maybeSingle()
    if (lessonError) throw lessonError
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    const learner = await resolveLearnerSubjects(supabase as never, user.id)
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: 'Choose your subjects in onboarding before rating lessons', code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 })
    }
    if (!assertRequestedLearnerSubject(learner.subjects, lesson.subject)) {
      return NextResponse.json({ error: 'That lesson is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }

    const { error } = await supabase.from('lesson_votes').upsert({ user_id: user.id, lesson_id: id, helpful }, { onConflict: 'user_id,lesson_id' })
    if (error) throw error
    resetLibraryCache()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[library/vote]', error)
    return NextResponse.json({ error: 'Could not save your rating', retryable: true }, { status: 500 })
  }
}
