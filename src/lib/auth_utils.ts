import type { SupabaseClient } from '@supabase/supabase-js';

// Define a specific error type for authorization failures
export class UnauthorizedError extends Error {
  constructor(message: string = "User is not authorized to access this resource.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Fetches a task by its ID and verifies that it belongs to the currently authenticated user.
 * This function provides an application-level authorization boundary check, acting as a safeguard
 * against potential RLS misconfigurations or forgotten authorization clauses in database queries.
 *
 * @param supabase The Supabase client instance (e.g., created by `createClient`, `createClientComponentClient`, etc.).
 * @param taskId The ID of the task to fetch and authorize.
 * @returns A Promise that resolves to the task object if the user is authorized and the task exists.
 * @throws UnauthorizedError if no user is authenticated, the task does not exist, or the task does not belong to the current user.
 * @throws Error for other unexpected database issues.
 */
export async function getAuthorizedTask(
  supabase: SupabaseClient,
  taskId: number
) {
  // 1. Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("Supabase auth error:", userError);
    throw new UnauthorizedError("Failed to retrieve authenticated user.");
  }

  if (!user) {
    throw new UnauthorizedError("No authenticated user.");
  }

  // 2. Fetch the task from the database
  const { data: task, error: dbError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single(); // Use .single() to expect one row or null

  if (dbError) {
    console.error("Database error fetching task:", dbError);
    // Supabase returns PGRST116 when no row is found with .single()
    if (dbError.code === 'PGRST116') {
      throw new UnauthorizedError("Task not found or not accessible.");
    }
    throw new Error(`Failed to fetch task due to database error: ${dbError.message}`);
  }

  // 3. Verify task existence and ownership
  if (!task) {
    // This case should ideally be covered by PGRST116 error, but as a safeguard.
    throw new UnauthorizedError("Task not found or not accessible.");
  }

  if (task.user_id !== user.id) {
    throw new UnauthorizedError("Task does not belong to the current user.");
  }

  return task;
}
