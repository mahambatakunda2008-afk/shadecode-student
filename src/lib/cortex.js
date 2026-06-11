import { createServerClient } from './supabaseClient';

export async function generateInsight(userId, eventType, eventData = {}) {
  if (!userId || !eventType) {
    console.error('generateInsight: userId and eventType are required.');
    return;
  }

  const supabase = createServerClient();
  let insightText;

  switch (eventType) {
    case 'task_completed':
      insightText = `You completed a task titled '${eventData.title || 'an unnamed task'}'.`;
      break;
    case 'subject_created':
      insightText = `You added a new study subject: '${eventData.name || 'an unnamed subject'}'.`;
      break;
    case 'daily_challenge_completed':
      insightText = `You successfully completed today's daily challenge, earning XP.`;
      break;
    default:
      insightText = `Observed a new activity of type: ${eventType}.`;
  }

  try {
    const { data, error } = await supabase
      .from('cortex_insights')
      .insert({
        user_id: userId,
        insight: insightText,
      })
      .select();

    if (error) {
      console.error('Error inserting insight:', error);
    } else {
      console.log('Insight generated and stored:', data);
    }
  } catch (err) {
    console.error('Exception during insight generation:', err);
  }
}
