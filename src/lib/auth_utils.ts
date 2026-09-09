import type { SupabaseClient } from '@supabase/supabase-js';

export class UnauthorizedError extends Error {
  constructor(message: string = "User is not authorized to access this resource.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getAuthorizedTask(supabase: SupabaseClient, taskId: number) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new UnauthorizedError("Failed to retrieve authenticated user.");
  if (!user) throw new UnauthorizedError("No authenticated user.");
  const { data: task, error: dbError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (dbError) {
    if (dbError.code === 'PGRST116') throw new UnauthorizedError("Task not found or not accessible.");
    throw new Error(`Failed to fetch task due to database error: ${dbError.message}`);
  }
  if (!task || task.user_id !== user.id) throw new UnauthorizedError("Task not found or not accessible.");
  return task;
}
