// src/app/api/results/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ExamResultPayload = {
  subject: string
  topic?: string
  difficulty: string
  score: number
  total: number
  time_taken: number
  xp_earned: number
  grade: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body: ExamResultPayload = await request.json()

    const required = ['subject', 'difficulty', 'score', 'total', 'time_taken', 'xp_earned', 'grade']
    for (const field of required) {
      if (body[field as keyof ExamResultPayload] === undefined) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
      }
    }

    let user_name: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()
      user_name = profile?.username ?? profile?.display_name ?? null
    }

    const { data, error } = await supabase
      .from('exam_results')
      .insert({
        user_id: user?.id ?? null,
        user_name,
        ...body,
        topic: body.topic ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[results/POST]', error)
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      shareUrl: `/results/${data.id}`,
    })
  } catch (err) {
    console.error('[results/POST] unexpected', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('exam_results')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
