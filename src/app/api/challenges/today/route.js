import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/challenges/today
 * Fetches the current user's uncompleted daily challenge for today.
 * Assumes daily_challenges table has columns: id, user_id, title, description, xp_reward, completed, created_at.
 */
export async function GET(request) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Define today's date range to filter challenges created today
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Start of tomorrow (end of today)

  const { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('id, title, description, xp_reward, completed') // Selecting assumed columns for daily_challenges
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString()) // Filter challenges created from today's start
    .lt('created_at', tomorrow.toISOString()) // Filter challenges created before tomorrow's start
    .eq('completed', false) // Only fetch uncompleted challenges
    .maybeSingle(); // Use maybeSingle to return null if no rows, instead of throwing an error

  if (error && error.code !== 'PGRST116') { // PGRST116 means 'No rows found', which is handled by maybeSingle returning null
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(challenge);
}
