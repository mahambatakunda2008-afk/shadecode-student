import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { recordCortexInsight } from '@/lib/cortex';

export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

export async function PUT(request, { params }) {
  const { id } = params;
  const supabase = createServerClient();

  // Get user from the caller's own session token. createServerClient() uses
  // the service-role key (needed below for recordCortexInsight), which
  // carries no ambient session -- auth.getUser() must be given the token
  // explicitly or it can never resolve a real user, matching the pattern
  // used by every other authenticated route in this codebase.
  const token = getBearerToken(request);
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null } };

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // 1. Mark task as completed
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure the user owns the task
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return new NextResponse(JSON.stringify({ error: 'Failed to complete task' }), { status: 500 });
    }

    if (!updatedTask) {
      // Task not found or not owned by user
      return new NextResponse(JSON.stringify({ error: 'Task not found or unauthorized to update' }), { status: 404 });
    }

    // 2. Generate an insight for the completed task
    await recordCortexInsight(user.id, 'task_completed', { taskId: updatedTask.id, title: updatedTask.title });

    return new NextResponse(JSON.stringify(updatedTask), { status: 200 });

  } catch (error) {
    console.error('Unhandled error in task completion API:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
