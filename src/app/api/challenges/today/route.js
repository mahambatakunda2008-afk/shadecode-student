import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get start and end of today in UTC for filtering
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  // Check for an existing challenge for today for the user
  let { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString()) // Challenge created today or later
    .lt('created_at', tomorrow.toISOString()) // Challenge created before tomorrow
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json({ error: 'Failed to fetch daily challenge' }, { status: 500 });
  }

  // If no challenge exists for today, return null to indicate to the frontend
  if (!challenge) {
    return NextResponse.json({ challenge: null, message: "No daily challenge found for today. Cortex will generate one for you soon!" }, { status: 200 });
  }

  return NextResponse.json({ challenge }, { status: 200 });
}
