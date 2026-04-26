import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, taskId, subjectId } = await req.json();

    // --- Placeholder for Gemini AI Integration ---
    // In a real scenario, this would involve:
    // 1. Fetching relevant user activity data (e.g., tasks, subjects).
    // 2. Constructing a prompt for Gemini based on this data.
    // 3. Calling the Gemini API and parsing its response.
    // For now, we generate a dummy insight.
    
    const dummyInsights = [
      "You've been consistently completing tasks in the same subject this week.",
      "Your study sessions tend to be longer when you tackle new subjects.",
      "You often complete tasks shortly after they are created.",
      "There's a recurring pattern of you focusing on a single subject for several days.",
      "You complete tasks evenly throughout the day, rather than in one long burst."
    ];

    const insightText = dummyInsights[Math.floor(Math.random() * dummyInsights.length)];

    // --- End Placeholder ---

    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id: userId || user.id,
        subject_id: subjectId || null,
        insight_text: insightText,
        type: 'pattern' // Default type for initial insights
      })
      .select();

    if (error) {
      console.error('Error inserting insight:', error);
      return NextResponse.json({ error: 'Failed to save insight' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Insight generated and saved successfully', insight: data[0] }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
