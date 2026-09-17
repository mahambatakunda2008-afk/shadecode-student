// src/app/api/challenge/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects'

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const {
      result_id, subject, topic, difficulty,
      question_count, percentage, total_score, max_score, time_taken, grade,
    } = body

    if (user && typeof subject === 'string' && subject.trim()) {
      const learnerSubjects = await resolveLearnerSubjects(supabase, user.id)
      const canonicalSubject = assertRequestedLearnerSubject(learnerSubjects, subject)
      if (!canonicalSubject) {
        return NextResponse.json({
          error: learnerSubjects.length
            ? 'That subject is not in your selected subjects.'
            : 'Choose your subjects in onboarding before creating a challenge.',
          code: 'SUBJECT_NOT_ALLOWED',
          subjects: learnerSubjects,
        }, { status: 400 })
      }
      body.subject = canonicalSubject.name
    }

    let challenger_name: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()
      challenger_name = profile?.username ?? profile?.display_name ?? null
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        result_id:      result_id ?? null,
        challenger_id:  user?.id ?? null,
        challenger_name,
        subject:        body.subject ?? null,
        topic:          topic ?? null,
        difficulty,
        question_count: question_count ?? 10,
        percentage,
        total_score,
        max_score,
        time_taken,
        grade,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[challenge/POST]', error)
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    return NextResponse.json({
      id:           data.id,
      challengeUrl: `/challenge/${data.id}`,
    })
  } catch (err) {
    console.error('[challenge/POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
