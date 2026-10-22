import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from '@/lib/subjects/resolveLearnerSubjects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const learner = await resolveLearnerSubjects(supabase as never, user.id);
  if (learner.subjects.length === 0) {
    return NextResponse.json({ sources: [], code: 'SUBJECT_NOT_ALLOWED' }, { status: 409 });
  }

  const { data: allSyllabi, error: syllabiError } = await supabase
    .from('syllabi')
    .select('id, subject');
  if (syllabiError) {
    console.error('Syllabus access lookup failed:', syllabiError);
    return NextResponse.json({ error: 'Unable to verify selected subjects' }, { status: 500 });
  }
  const allowedSyllabusIds = (allSyllabi ?? [])
    .filter((syllabus) => assertRequestedLearnerSubject(learner.subjects, syllabus.subject))
    .map((syllabus) => syllabus.id);
  if (allowedSyllabusIds.length === 0) return NextResponse.json({ sources: [] });

  const url = new URL(request.url);
  const requestedSyllabusId = url.searchParams.get('syllabus_id');
  if (requestedSyllabusId && !allowedSyllabusIds.includes(requestedSyllabusId)) {
    return NextResponse.json({ error: 'That syllabus is not available for your selected subjects', code: 'SUBJECT_NOT_ALLOWED' }, { status: 403 });
  }
  const board = url.searchParams.get('board');
  const syllabusId = url.searchParams.get('syllabus_id');
  const sourceKind = url.searchParams.get('source_kind');

  let query = supabase
    .from('paper_sources')
    .select('id,board,syllabus_id,title,source_url,source_kind,access_mode,rights_note,year,session,paper_number,variant,last_verified_at')
    .eq('active', true)
    .order('board')
    .order('title');

  query = query.in('syllabus_id', allowedSyllabusIds);
  if (board) query = query.eq('board', board.slice(0, 32));
  if (syllabusId) query = query.eq('syllabus_id', syllabusId.slice(0, 32));
  if (sourceKind) query = query.eq('source_kind', sourceKind.slice(0, 32));

  const { data, error } = await query;
  if (error) {
    console.error('Paper source lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load paper sources' }, { status: 500 });
  }

  return NextResponse.json({ sources: data ?? [] });
}
