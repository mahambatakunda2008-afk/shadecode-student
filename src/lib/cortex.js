import { createClient } from '@supabase/supabase-js';

/**
 * Generates a neutral insight for a given user based on their study data.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} user_id - The ID of the user.
 * @returns {Promise<object | null>} An object containing the generated insight text, or null if an error occurs.
 */
export async function generateInsight(supabase, user_id) {
  if (!user_id) {
    console.error('generateInsight: user_id is required.');
    return null;
  }

  // Fetch user's tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('completed, created_at, subject_id')
    .eq('user_id', user_id);

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    return null;
  }

  // Fetch user's subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('user_id', user_id);

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError);
    return null;
  }

  let insightText = "It seems like you're setting things up! Keep going to discover your learning patterns.";

  const completedTasks = tasks ? tasks.filter(task => task.completed).length : 0;
  const totalTasks = tasks ? tasks.length : 0;
  const uniqueSubjectsWithTasks = tasks ? new Set(tasks.map(task => task.subject_id)).size : 0;
  const totalSubjects = subjects ? subjects.length : 0;

  if (totalTasks > 0) {
    if (completedTasks > 0) {
      insightText = `You've completed ${completedTasks} task${completedTasks !== 1 ? 's' : ''} recently. That's great progress!`;
      if (uniqueSubjectsWithTasks > 0) {
        insightText += ` across ${uniqueSubjectsWithTasks} subject${uniqueSubjectsWithTasks !== 1 ? 's' : ''}.`;
      }
    } else {
      insightText = `You have ${totalTasks} task${totalTasks !== 1 ? 's' : ''} planned. Ready to make some progress?`;
    }
  } else if (totalSubjects > 0) {
    insightText = `You've defined ${totalSubjects} subject${totalSubjects !== 1 ? 's' : ''}. Consider adding some tasks to get started.`;
  }

  // This is where a real Gemini API call would be made with the collected data.
  // For now, we return the simulated insight.
  return { insight_text: insightText };
}