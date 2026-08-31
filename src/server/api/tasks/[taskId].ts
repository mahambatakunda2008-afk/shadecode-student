import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: No active session' });
  }

  const { taskId } = req.query;
  
  if (req.method === 'PUT') {
    const { title, description, due_date } = req.body;

    // 1. Verify task ownership before update operation
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('user_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !existingTask) {
      // For security, if the task is not found or accessible, return 404/403
      // to avoid leaking information about existence of tasks not owned by user.
      return res.status(404).json({ error: 'Task not found or not accessible.' });
    }

    if (existingTask.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this task.' });
    }

    // 2. Perform the update if authorization is successful
    const { data, error: updateError } = await supabase
      .from('tasks')
      .update({ title, description, due_date, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select(); // Return the updated task data

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }
    return res.status(200).json(data[0]);
  }

  if (req.method === 'GET') {
    // Ensure user can only view their own tasks
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id) // Explicitly filter by user_id for authorization
      .single();

    if (fetchError || !task) {
      return res.status(404).json({ error: 'Task not found or not accessible.' });
    }
    return res.status(200).json(task);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}