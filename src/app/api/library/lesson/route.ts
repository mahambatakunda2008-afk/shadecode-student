// src/app/api/library/lesson/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{8,64}$/i.test(id)) return NextResponse.json({ error: 'Invalid lesson' }, { status: 400 })

  try {
    const supabase = await createSupabaseServerClient()
    // Authenticate and establish eligibility before reading lesson content.
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to open lessons' }, { status: 401 })

    const learner = await resolveLearnerSubjects(supabase as never, user.id)
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: 'Choose your subjects in onboarding before opening lessons', code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('lesson_library')
      .select('id, title, topic, subject, difficulty, blocks, helpful_up, helpful_down')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    if (!assertRequestedLearnerSubject(learner.subjects, data.subject)) {
      return NextResponse.json({ error: 'That lesson is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
    }
    const { data: vote } = user
      ? await supabase.from('lesson_votes').select('helpful').eq('lesson_id', id).eq('user_id', user.id).maybeSingle()
      : { data: null }
    return NextResponse.json({ lesson: data, myVote: vote ? (vote.helpful ? 'up' : 'down') : null })
  } catch (error) {
    console.error('[library/lesson]', error)
    return NextResponse.json({ error: 'Could not load that lesson', retryable: true }, { status: 500 })
  }
}
