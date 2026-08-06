// src/app/api/challenge/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { challenge_id, percentage, total_score, max_score, time_taken, grade, challenger_percentage } = body

    let user_name: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()
      user_name = profile?.username ?? profile?.display_name ?? null
    }

    const won = percentage > challenger_percentage

    const { error } = await supabase
      .from('challenge_attempts')
      .insert({
        challenge_id,
        user_id:     user?.id ?? null,
        user_name,
        percentage,
        total_score,
        max_score,
        time_taken,
        grade,
        won,
      })

    if (error) console.error('[challenge/attempt POST]', error)
    // Non-fatal — return result regardless
    return NextResponse.json({ won })
  } catch (err) {
    console.error('[challenge/attempt POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
