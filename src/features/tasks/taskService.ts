import type { SupabaseClient } from '@supabase/supabase-js';

// Matches the real `tasks` table schema (verified directly against
// information_schema, not assumed) -- there is no description, due_date,
// status, or profile_id column. Ownership is tracked via user_id, and
// completion is a plain boolean, not a status enum.
export interface Task {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  completed: boolean;
  created_at: string;
}

/**
 * Retrieves a specific task by its ID, ensuring it belongs to the authenticated user.
 * This function hardens authorization boundaries by explicitly checking task ownership,
 * independent of Row Level Security -- a defense-in-depth safety net, not a replacement
 * for it. Pass an already-authenticated Supabase client (e.g. from
 * createServerClient() + a caller's session token); this function never creates its
 * own client, since an unauthenticated client would be blocked by RLS regardless of
 * the ownership check below, making the check meaningless.
 *
 * @param supabase An authenticated Supabase client for the calling user's session.
 * @param taskId The ID of the task to retrieve.
 * @param userId The ID of the currently authenticated user (from auth context).
 * @returns The task object if found and authorized.
 * @throws An error if the task is not found, or if it does not belong to the user.
 */
export async function getTaskById(supabase: SupabaseClient, taskId: string, userId: string): Promise<Task> {
  if (!userId) {
    throw new Error('Authentication required: User ID is missing.');
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, user_id, subject_id, title, completed, created_at')
    .eq('id', taskId)
    .single();

  if (error) {
    // Supabase specific error code for 'No rows found'
    if (error.code === 'PGRST116') {
      throw new Error('Task not found.');
    }
    throw new Error(`Failed to retrieve task: ${error.message}`);
  }

  // --- START: Authorization Boundary Regression Coverage ---
  // This explicit check ensures that the retrieved task's user_id matches
  // the currently authenticated user's ID. This acts as a critical server-side
  // defense, providing regression coverage even if Row Level Security (RLS)
  // or API route filters are misconfigured or overlooked in the future.
  if (task.user_id !== userId) {
    throw new Error('Unauthorized access: Task does not belong to the current user.');
  }
  // --- END: Authorization Boundary Regression Coverage ---

  return task;
}

export async function createTask(
  supabase: SupabaseClient,
  taskData: { title: string; subject_id?: string | null; completed?: boolean },
  userId: string
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...taskData, user_id: userId })
    .select('id, user_id, subject_id, title, completed, created_at')
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
  return data;
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  userId: string,
  updates: Partial<Pick<Task, 'title' | 'completed' | 'subject_id'>>
): Promise<Task> {
  // First, verify ownership using the already hardened getTaskById to avoid partial updates on unauthorized tasks
  await getTaskById(supabase, taskId, userId);

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select('id, user_id, subject_id, title, completed, created_at')
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }
  return data;
}
