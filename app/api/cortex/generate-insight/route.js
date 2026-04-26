// app/api/cortex/generate-insight/route.js
import { createClient } from '@supabase/supabase-js';
import { generateInsight } from '@/lib/cortex';

// Initialize Supabase client with the service role key for backend operations.
// This key bypasses Row Level Security and should be kept absolutely secure.
// It enables the backend to insert data for any user.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check for missing environment variables at module load time
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('CRITICAL ERROR: Missing Supabase environment variables for Cortex API. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  : null; // Set to null if environment variables are missing


export async function POST(req) {
  // Re-check for supabase client availability on each request
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase environment variables not configured. Cortex API is non-functional.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate the insight using the Cortex logic, passing the service role client
    const insight = await generateInsight(supabase, userId);

    // Store the insight in Supabase using the service role client
    const { data: insertedInsight, error: insertError } = await supabase
      .from('insights')
      .insert({
        user_id: userId,
        title: insight.title,
        content: insight.content,
        metadata: insight.metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting insight:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store insight', details: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Insight generated and stored successfully', insight: insertedInsight }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-insight API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}