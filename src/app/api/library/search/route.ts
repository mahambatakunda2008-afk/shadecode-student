// src/app/api/library/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyRateLimit, generalApiLimiter } from '@/lib/rate-limit/limiter'
import { bestSnippet, search } from '@/lib/library/bm25'
import { loadLibrary } from '@/lib/library/store'
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects'

export const dynamic = 'force-dynamic'

/** Searches lessons learners have actually used. Pure BM25: no model, so it works whenever the database does. */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter)
  if (limited) return limited

  const params = new URL(request.url).searchParams
  const query = (params.get('q') ?? '').trim().slice(0, 200)
  const subject = (params.get('subject') ?? '').trim().slice(0, 60) || undefined
  if (query.length < 2) return NextResponse.json({ error: 'Type at least two characters', results: [] }, { status: 400 })

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Sign in to search lessons' }, { status: 401 })

    const learner = await resolveLearnerSubjects(supabase as never, user.id)
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: 'Choose your subjects in onboarding before searching the library', code: 'SUBJECT_NOT_ALLOWED', results: [] }, { status: 409 })
    }
    if (!subject || !assertRequestedLearnerSubject(learner.subjects, subject)) {
      return NextResponse.json({ error: 'Search within one of your selected subjects', code: 'SUBJECT_NOT_ALLOWED', results: [] }, { status: 403 })
    }

    const library = await loadLibrary(supabase as never)
    const results = search(library.index, query, { subject, limit: 8 }).map((hit) => {
      const row = library.rows.get(hit.id)!
      return {
        id: row.id,
        title: row.title,
        subject: row.subject,
        difficulty: row.difficulty,
        snippet: bestSnippet(row.blocks, query),
        helpful: { up: row.helpful_up, down: row.helpful_down },
      }
    })
    return NextResponse.json({ results, total: library.rows.size })
  } catch (error) {
    console.error('[library/search]', error)
    return NextResponse.json({ error: 'The library is unavailable right now. Please try again.', retryable: true }, { status: 500 })
  }
}
