import { createClient } from '@supabase/supabase-js';

// Assuming Supabase client is initialized elsewhere and exported.
// For this example, we'll simulate a client import.
// In a real application, this would likely be `import { supabase } from '../../lib/supabaseClient';`
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// This is a placeholder for demonstration purposes. 
// In a real app, `supabase` would be imported from a centralized client setup.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Task {
  id: string;
  profile_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'in_progress';
  created_at: string;
}

/**
 * Retrieves a specific task by its ID, ensuring it belongs to the authenticated user.
 * This function hardens authorization boundaries by explicitly checking task ownership.
 * 
 * @param taskId The ID of the task to retrieve.
 * @param userId The ID of the currently authenticated user (from auth context).
 * @returns The task object if found and authorized.
 * @throws An error if the task is not found, or if it does not belong to the user.
 */
export async function getTaskById(taskId: string, userId: string): Promise<Task> {
  if (!userId) {
    throw new Error('Authentication required: User ID is missing.');
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, profile_id, title, description, due_date, status, created_at')
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
  // This explicit check ensures that the retrieved task's profile_id matches 
  // the currently authenticated user's ID. This acts as a critical server-side 
  // defense, providing regression coverage even if Row Level Security (RLS) 
  // or API route filters are misconfigured or overlooked in the future.
  if (task.profile_id !== userId) {
    throw new Error('Unauthorized access: Task does not belong to the current user.');
  }
  // --- END: Authorization Boundary Regression Coverage ---

  return task;
}

// Placeholder for other task-related service functions
export async function createTask(taskData: Omit<Task, 'id' | 'created_at'>, userId: string): Promise<Task> {
  // In a real scenario, taskData.profile_id should be set to userId
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...taskData, profile_id: userId })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
  return data;
}

export async function updateTask(taskId: string, userId: string, updates: Partial<Omit<Task, 'id' | 'profile_id' | 'created_at'>>): Promise<Task> {
  // First, verify ownership using the already hardened getTaskById to avoid partial updates on unauthorized tasks
  await getTaskById(taskId, userId); 

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }
  return data;
}
