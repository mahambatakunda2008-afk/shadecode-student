import { createClient } from '@supabase/supabase-js';
import { generateInsight } from '../../../../src/lib/cortex';

// Helper to create Supabase client for server-side API routes
function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key to respect RLS
  );
}

export async function POST(req) {
  const supabase = getSupabaseServerClient();

  // Get the authenticated user from the session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Unauthorized user access:', userError ? userError.message : 'No user');
    return new Response(JSON.stringify({ error: 'Unauthorized: No active user session.' }), { status: 401 });
  }

  const user_id = user.id;

  const insightResult = await generateInsight(supabase, user_id);

  if (!insightResult || !insightResult.insight_text) {
    return new Response(JSON.stringify({ error: 'Failed to generate insight.' }), { status: 500 });
  }

  // Save the generated insight to the database
  const { data, error: insertError } = await supabase
    .from('insights')
    .insert({
      user_id: user_id,
      insight_text: insightResult.insight_text,
    })
    .select(); // Return the inserted data

  if (insertError) {
    console.error('Error saving insight to DB:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to save insight.', details: insertError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: 'Insight generated and saved successfully.', insight: data[0] }), { status: 200 });
}