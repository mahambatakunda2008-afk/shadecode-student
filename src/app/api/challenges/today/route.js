import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data: challenge, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .single(); // Use single to get one row or null

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
      console.error('Error fetching daily challenge:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!challenge) {
      return new Response(JSON.stringify({ message: 'No challenge found for today.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(challenge), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in /api/challenges/today:', error);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}