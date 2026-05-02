import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations (e.g., in a route handler)
// This assumes SUPABASE_URL and SUPABASE_ANON_KEY are available in the environment
// IMPORTANT: This client is for server-side use in lib files called by API routes.
// It should not be used directly in client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRole = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey // Use service role key if available, otherwise anon key (less secure for writes)
); 

/**
 * Placeholder function to generate a neutral insight for a user.
 * In future iterations, this will analyze user activity data.
 * @param {string} userId The ID of the user for whom to generate an insight.
 * @returns {Promise<object>} An object containing the generated insight text and any relevant context.
 */
export async function generateInsight(userId) {
  // In a real scenario, Cortex would fetch user data from tasks, subjects, etc.
  // For now, this is a placeholder demonstrating the structure.

  let insightText = "No significant patterns observed recently. Keep up the great work!";
  const sourceContext = {
    // Placeholder for data that informed the insight
    timestamp: new Date().toISOString()
  };

  try {
    // Example: Fetch recent tasks to inform an insight
    const { data: tasks, error: tasksError } = await supabaseServiceRole
      .from('tasks')
      .select('id, title, completed, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tasksError) throw tasksError;

    if (tasks && tasks.length > 0) {
      const completedTasks = tasks.filter(task => task.completed).length;
      if (completedTasks === tasks.length) {
        insightText = `You've recently completed all your last ${tasks.length} tasks! Great consistency.`;
      } else if (completedTasks > 0 && completedTasks < tasks.length) {
        insightText = `You've made progress on ${completedTasks} of your last ${tasks.length} tasks. Keep pushing forward!`;
      } else if (completedTasks === 0) {
        insightText = `It looks like your last ${tasks.length} tasks are still in progress. Don't forget to mark them complete!`;
      }
      sourceContext.recentTasks = tasks.map(t => ({ id: t.id, title: t.title, completed: t.completed }));
    }

  } catch (error) {
    console.error('Error fetching data for insight generation:', error);
    insightText = "An error occurred while generating your insight. Please try again later.";
  }

  return {
    insight_text: insightText,
    source_context: sourceContext
  };
}

/**
 * Utility function to store a generated insight via the API.
 * @param {string} userId The ID of the user associated with the insight.
 * @param {string} insightText The text of the insight.
 * @param {object} [sourceContext] Optional, contextual data that informed the insight.
 */
export async function storeInsight(userId, insightText, sourceContext = {}) {
  try {
    // In a production app, this would likely be an internal API call
    // or a direct database insert by a service. For now, simulating with a fetch to our API route.
    const response = await fetch('/api/cortex/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        insight_text: insightText,
        user_id: userId, // The API route will verify and use auth.uid() but we pass for clarity
        source_context: sourceContext
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to store insight: ${errorData.error}`);
    }

    const storedInsight = await response.json();
    console.log('Insight stored successfully:', storedInsight);
    return storedInsight;
  } catch (error) {
    console.error('Error in storeInsight:', error);
    throw error;
  }
}
