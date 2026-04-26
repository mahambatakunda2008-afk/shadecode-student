import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Assuming this route handles PATCH requests for updating task status
export async function PATCH(req, { params }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const { completed } = await req.json(); // Expecting { completed: true/false }

  if (typeof completed === 'undefined') {
    return NextResponse.json({ error: 'Missing completion status' }, { status: 400 });
  }

  try {
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, user_id, subject_id, completed')
      .eq('id', id)
      .single();

    if (fetchError || !existingTask) {
      console.error('Error fetching task:', fetchError);
      return NextResponse.json({ error: 'Task not found or forbidden' }, { status: 404 });
    }

    if (existingTask.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only proceed if task is being marked as completed and was not previously completed
    if (completed === true && existingTask.completed === false) {
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({ completed, completed_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (updateError) {
        console.error('Error updating task:', updateError);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
      }

      // --- Trigger Cortex Insight Generation ---
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/cortex/generate-insight`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cookies().get('sb-access-token')?.value}` // Pass auth token for internal call
          },
          body: JSON.stringify({
            userId: user.id,
            taskId: id,
            subjectId: existingTask.subject_id
          })
        });
        // No need to await for response or handle success/failure of insight generation here
        // It should run in the background and not block the task completion response
      } catch (insightError) {
        console.warn('Failed to trigger insight generation:', insightError);
        // Continue processing the task update even if insight generation fails
      }
      // --- End Trigger ---

      return NextResponse.json(updatedTask[0], { status: 200 });
    } else {
      // If not marking as completed, or if already completed, just update without insight trigger
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', id)
        .select();

      if (updateError) {
        console.error('Error updating task:', updateError);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
      }

      return NextResponse.json(updatedTask[0], { status: 200 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
