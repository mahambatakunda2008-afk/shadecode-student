import { createClient } from '@supabase/supabase-js';

/**
 * Generates a simple insight based on user's completed tasks and stores it in the database.
 * @param {string} userId - The ID of the user for whom to generate the insight.
 * @param {object} supabaseClient - An initialized Supabase client instance.
 * @returns {Promise<object | null>} The created insight data or null if an error occurred.
 */
export async function generateAndStoreInsight(userId, supabaseClient) {
  if (!userId) {
    console.error('generateAndStoreInsight: User ID is required.');
    return null;
  }

  // Example: Count completed tasks for the user
  const { count: completedTasks, error: tasksError } = await supabaseClient
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true);

  if (tasksError) {
    console.error('Error fetching tasks for insight generation:', tasksError.message);
    return null;
  }

  let insightText = '';
  let patternType = 'activity_summary';

  if (completedTasks && completedTasks > 0) {
    insightText = `You've completed ${completedTasks} task${completedTasks === 1 ? '' : 's'} across your subjects. Keep up the consistent effort!`;
  } else {
    insightText = "It looks like you haven't completed any tasks yet. Try starting with a small task to build momentum!";
  }

  const { data, error } = await supabaseClient.from('insights').insert({
    user_id: userId,
    insight_text: insightText,
    pattern_type: patternType,
  }).select();

  if (error) {
    console.error('Error storing insight:', error.message);
    return null;
  }

  console.log('Insight generated and stored:', data);
  return data[0];
}
