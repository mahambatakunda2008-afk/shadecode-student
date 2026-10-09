// src/app/api/challenge/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { sanitizeQuestions } from '@/lib/challenge/questions'

export const dynamic = 'force-dynamic'

/** Returns the frozen question set for a battle so both players sit identical questions. */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{8,64}$/i.test(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('challenge_questions').select('questions, marking').eq('challenge_id', id).maybeSingle()
  const questions = data ? sanitizeQuestions(data.questions) : null
  if (!questions) return NextResponse.json({ error: 'No frozen questions for this challenge' }, { status: 404 })

  return NextResponse.json({ questions, marking: data?.marking === 'server' ? 'server' : 'client' })
}
