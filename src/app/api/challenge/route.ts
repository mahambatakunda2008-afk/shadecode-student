// src/app/api/challenge/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sanitizeQuestions } from '@/lib/challenge/questions'
import { challengeFromResult } from '@/lib/challenge/fromResult'
import { isDeterministicPaper, splitPaper } from '@/lib/challenge/serverMarking'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects'
import { resolveLearnerSubject } from '@/lib/academic/subjectAccess'

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Sign in to create a challenge' }, { status: 401 })

    const body = await request.json()
    const result_id: unknown = body?.result_id
    if (typeof result_id !== 'string' || !/^[0-9a-f-]{8,64}$/i.test(result_id)) {
      return NextResponse.json({ error: 'result_id required' }, { status: 400 })
    }

    const { data: resultRow } = await supabase
      .from('exam_results')
      .select('subject, topic, difficulty, score, total_questions, correct_answers, time_taken')
      .eq('id', result_id)
      .maybeSingle()
    const fields = challengeFromResult(resultRow)
    if (!fields) return NextResponse.json({ error: 'Result not found' }, { status: 404 })

    {
      const resolved = await resolveLearnerSubjects(supabase, user.id)
      const learnerSubjects = resolved.subjects
      const canonicalSubject = assertRequestedLearnerSubject(learnerSubjects, fields.subject)
      if (!canonicalSubject) {
        return NextResponse.json({
          error: learnerSubjects.length
            ? 'That subject is not in your selected subjects.'
            : 'Choose your subjects in onboarding before creating a challenge.',
          code: 'SUBJECT_NOT_ALLOWED',
          subjects: learnerSubjects,
        }, { status: 400 })
      }
      fields.subject = canonicalSubject.name
    }

    let challenger_name: string | null = null
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()
    challenger_name = profile?.username ?? profile?.display_name ?? null

    const admin = createSupabaseAdminClient()

    // result_id is intentionally not granted to browser roles. Use the server client
    // for duplicate detection so the private linkage ID does not need to be exposed.
    if (admin) {
      const { data: existing } = await admin
        .from('challenges')
        .select('id')
        .eq('result_id', result_id)
        .eq('challenger_id', user.id)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ id: existing.id, challengeUrl: `/challenge/${existing.id}`, frozen: true })
      }
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        result_id,
        challenger_id: user.id,
        challenger_name,
        subject: fields.subject,
        topic: fields.topic,
        difficulty: fields.difficulty,
        question_count: fields.question_count,
        percentage: fields.percentage,
        total_score: fields.total_score,
        max_score: fields.max_score,
        time_taken: fields.time_taken,
        grade: fields.grade,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[challenge/POST]', error)
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    // Freeze the exact questions the challenger sat so the opponent answers the same set.
    let frozen = false
    {
      const { data: sat } = await supabase
        .from('exam_result_questions')
        .select('questions')
        .eq('result_id', result_id)
        .maybeSingle()
      const questions = sat ? sanitizeQuestions(sat.questions) : null
      if (questions) {
        let playSet = questions
        let marking: 'server' | 'client' = 'client'
        if (admin && isDeterministicPaper(questions)) {
          const split = splitPaper(questions)
          const { error: keyError } = await admin.from('challenge_answer_keys').insert({ challenge_id: data.id, key: split.key })
          if (keyError) console.error('[challenge/POST key]', keyError)
          else { playSet = split.playSet; marking = 'server' }
        }
        const { error: freezeError } = await supabase.from('challenge_questions').insert({ challenge_id: data.id, questions: playSet, marking })
        frozen = !freezeError
        if (freezeError) console.error('[challenge/POST freeze]', freezeError)
      }
    }

    return NextResponse.json({
      id: data.id,
      challengeUrl: `/challenge/${data.id}`,
      frozen,
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
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Sign in to open this subject challenge' }, { status: 401 })

  const { data, error } = await supabase
    .from('challenges')
    .select('id, challenger_id, challenger_name, subject, topic, difficulty, question_count, percentage, total_score, max_score, time_taken, grade, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const subjectAccess = await resolveLearnerSubject(supabase, user.id, data.subject)
  if (!subjectAccess.ok) {
    return NextResponse.json({ error: subjectAccess.error, code: 'SUBJECT_NOT_ALLOWED' }, { status: subjectAccess.status })
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}
