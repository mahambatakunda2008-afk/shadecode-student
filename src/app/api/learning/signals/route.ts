// src/app/api/learning/signals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { sanitizeSignals } from '@/lib/learning/signals'

export const dynamic = 'force-dynamic'

/**
 * Records what a learner did with content so the platform can learn from it.
 * Always best-effort: callers fire and forget, and a failure never affects the student.
 */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const signals = sanitizeSignals(body?.signals)
    if (!signals.length) return NextResponse.json({ error: 'No valid signals' }, { status: 400 })

    const { error } = await supabase.from('learning_signals').insert(signals.map((signal) => ({ ...signal, user_id: user.id })))
    if (error) throw error
    return NextResponse.json({ ok: true, recorded: signals.length })
  } catch (error) {
    console.error('[learning/signals]', error)
    return NextResponse.json({ error: 'Could not record signals', retryable: true }, { status: 500 })
  }
}
