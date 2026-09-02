import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';

export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

async function getAuthedUser(request: Request) {
  const supabase = createServerClient();
  const token = getBearerToken(request);
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null } };
  return { supabase, user };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Ownership is enforced directly in the query filter (not checked after the
  // fact) so a task belonging to another user simply doesn't match -- no row
  // returned, no information leaked about whether it exists for someone else.
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found or not accessible' }, { status: 404 });
  return NextResponse.json(task, { status: 200 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, description, due_date } = body;

  // Ownership-scoped update: the .eq('user_id', ...) filter means a task
  // belonging to another user matches zero rows rather than requiring a
  // separate fetch-then-check step (which has a narrower TOCTOU window and
  // is one more place an ownership check could be missed on a future edit).
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({ title, description, due_date, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!updatedTask) return NextResponse.json({ error: 'Task not found or not accessible' }, { status: 404 });
  return NextResponse.json(updatedTask, { status: 200 });
}
