import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

  const url = new URL(request.url);
  const board = url.searchParams.get('board');
  const syllabusId = url.searchParams.get('syllabus_id');
  const sourceKind = url.searchParams.get('source_kind');

  let query = supabase
    .from('paper_sources')
    .select('id,board,syllabus_id,title,source_url,source_kind,access_mode,rights_note,year,session,paper_number,variant,last_verified_at')
    .eq('active', true)
    .order('board')
    .order('title');

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
