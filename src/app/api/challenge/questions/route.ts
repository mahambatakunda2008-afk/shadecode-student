// src/app/api/challenge/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { sanitizeQuestions } from '@/lib/challenge/questions'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'

export const dynamic = 'force-dynamic'

/** Returns the frozen question set only to learners enrolled in the challenge subject. */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{8,64}$/i.test(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Sign in to access challenge questions' }, { status: 401 })

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('subject')
    .eq('id', id)
    .maybeSingle()
  if (challengeError) return NextResponse.json({ error: 'Could not verify challenge subject' }, { status: 500 })
  if (!challenge?.subject || typeof challenge.subject !== 'string') {
    return NextResponse.json({ error: 'Challenge subject could not be verified', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 })
  }

  const subjectAccess = await resolveLearnerSubject(supabase, user.id, challenge.subject)
  if (!subjectAccess.ok) {
    return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
  }

  const { data, error } = await supabase
    .from('challenge_questions')
    .select('questions, marking')
    .eq('challenge_id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not load challenge questions' }, { status: 500 })

  const questions = data ? sanitizeQuestions(data.questions) : null
  if (!questions) return NextResponse.json({ error: 'No frozen questions for this challenge' }, { status: 404 })

  return NextResponse.json({ questions, marking: data?.marking === 'server' ? 'server' : 'client' })
}
