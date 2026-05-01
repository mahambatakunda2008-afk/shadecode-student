import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper to get Supabase client and set session from cookies manually
const getSupabaseClientWithSession = async () => {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Do not persist session on server-side
    },
  });

  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      console.error('Error setting session:', sessionError.message);
      return null; // Failed to set session
    }
  } else {
    return null; // No session tokens found
  }
  return supabase;
};

/**
 * Generates and stores a new insight for the current user.
 * This function should be called with an authenticated Supabase client.
 * For now, this is a placeholder insight until full Cortex integration.
 * @param {object} supabase An initialized Supabase client with user session set.
 * @param {string} userId The ID of the user.
 * @param {string} insightContent The content of the insight.
 * @param {string | null} [subjectId=null] Optional subject context for the insight.
 * @param {string | null} [taskId=null] Optional task context for the insight.
 * @returns {Promise<{ data: any | null, error: Error | null }>}
 */
export async function generateInsight(supabase, userId, insightContent, subjectId = null, taskId = null) {
  const { data, error } = await supabase
    .from('insights')
    .insert([
      { user_id: userId, content: insightContent, subject_id: subjectId, task_id: taskId },
    ])
    .select();

  return { data, error };
}

export async function POST(req) {
  const supabase = await getSupabaseClientWithSession();

  if (!supabase) {
    return new NextResponse('Unauthorized: No active session or failed to initialize client', { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This might happen if session was set but user is no longer valid, or refresh failed.
    return new NextResponse('Unauthorized: No user found after session validation', { status: 401 });
  }

  // For initial implementation, generate a generic insight
  const defaultInsightContent = `Cortex observed you are actively using Shadecode Student! Keep up the great work.`;
  const { data, error } = await generateInsight(supabase, user.id, defaultInsightContent);

  if (error) {
    console.error('Error generating insight:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new NextResponse(JSON.stringify({ message: 'Insight generated successfully', insight: data[0] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
