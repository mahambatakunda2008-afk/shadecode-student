// lib/cortex.js
/**
 * Placeholder function to generate a simple insight.
 * In the future, this will incorporate complex logic to analyze user task and subject data.
 * @param {object} supabase A Supabase client instance with appropriate permissions.
 * @param {string} userId The ID of the user for whom to generate the insight.
 * @returns {Promise<{title: string, content: string, metadata?: object}>}
 */
export async function generateInsight(supabase, userId) {
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (tasksError) {
    console.error('Error fetching tasks for insight generation:', tasksError);
    return {
      title: "Your Learning Journey Begins!",
      content: "It looks like you're just getting started. Keep exploring subjects and tackling tasks to unlock more insights.",
      metadata: { initial_insight: true }
    };
  }

  const completedTasksCount = tasks.filter(task => task.completed).length;

  if (completedTasksCount > 0) {
    return {
      title: "First Steps in Task Completion",
      content: `You've completed ${completedTasksCount} task(s) recently. Consistent completion can help build momentum in your studies.`,
      metadata: { completed_tasks_count: completedTasksCount }
    };
  } else if (tasks.length > 0) {
    return {
      title: "Tasks Added, Ready to Go!",
      content: `You've added ${tasks.length} task(s). Now, the next step is to start tackling them!`,
      metadata: { total_tasks_added: tasks.length }
    };
  } else {
    return {
      title: "Awaiting Your Study Activity",
      content: "Cortex is ready to observe your learning patterns. Start by adding some tasks and subjects!",
      metadata: { initial_insight: true }
    };
  }
}