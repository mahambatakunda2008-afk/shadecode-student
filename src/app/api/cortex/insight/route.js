import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Mock insight generation - in a real scenario, this would involve Gemini API
async function generateMockInsight(userId, recentActivity) {
  const insightTemplates = [
    "It seems you're focusing on similar subjects lately. Consistency is key!",
    "You've completed several tasks this week. Keep up the great work!",
    "Notice a pattern in your study times? Optimizing your schedule could boost productivity.",
    "Exploring new subjects? A varied approach can broaden your understanding.",
    "Your engagement with tasks is a positive sign of active learning."
  ];
  const randomInsight = insightTemplates[Math.floor(Math.random() * insightTemplates.length)];
  const activitySummary = recentActivity.length > 0 ? ` You've recently worked on ${recentActivity.length} tasks.` : ' No recent tasks were found.';
  return `Cortex observes: ${randomInsight}${activitySummary}`;
}

// Helper to get Supabase client with cookies for server-side operations
function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        }
      }
    }
  );
}

export async function POST(request) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch recent user tasks for context (up to 5)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, completed, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tasksError) {
      console.error('Error fetching tasks for insight generation:', tasksError);
      // Continue even if tasks fail, generate a generic insight
    }

    const insightText = await generateMockInsight(user.id, tasks || []);

    const { data, error } = await supabase
      .from('insights')
      .insert([
        { user_id: user.id, insight_text: insightText }
      ])
      .select();

    if (error) {
      console.error('Error inserting insight:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Insight generated and stored', insight: data[0] }, { status: 201 });

  } catch (error) {
    console.error('API Error during insight generation:', error);
    return NextResponse.json({ error: 'Failed to generate or store insight' }, { status: 500 });
  }
}

export async function GET(request) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: insights, error } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching insights:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(insights, { status: 200 });

  } catch (error) {
    console.error('API Error during insight retrieval:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}