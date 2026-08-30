import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { emitServerLearningEvent } from '@/lib/intelligence/serverLearningEvents';

export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

export async function PUT(request, { params }) {
  const { id } = params;
  const supabase = createServerClient();
  const token = getBearerToken(request);
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null } };

  if (!user) return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return new NextResponse(JSON.stringify({ error: 'Failed to complete task' }), { status: 500 });
    }
    if (!updatedTask) return new NextResponse(JSON.stringify({ error: 'Task not found or unauthorized to update' }), { status: 404 });

    await emitServerLearningEvent({
      userId: user.id,
      source: 'tasks',
      sourceEventId: `task-complete:${updatedTask.id}`,
      type: 'task.completed',
      entityId: updatedTask.id,
      metadata: { title: updatedTask.title ?? null },
    });

    return new NextResponse(JSON.stringify(updatedTask), { status: 200 });
  } catch (error) {
    console.error('Unhandled error in task completion API:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
