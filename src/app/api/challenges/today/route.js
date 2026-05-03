import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

  // Check if a challenge exists for today for this user
  const { data: existingChallenges, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString())
    .lte('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()) // End of day
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no row found
    console.error('Error fetching daily challenge:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch daily challenge' }, { status: 500 });
  }

  if (existingChallenges && existingChallenges.length > 0) {
    return NextResponse.json(existingChallenges[0]);
  }

  // If no challenge exists for today, create a new one
  const newChallenge = {
    user_id: user.id,
    title: 'Code for 30 minutes', 
    description: 'Spend 30 minutes actively coding on any project or tutorial.',
    xp_reward: 100,
    completed: false,
    created_at: new Date().toISOString(),
  };

  const { data: insertedChallenge, error: insertError } = await supabase
    .from('daily_challenges')
    .insert(newChallenge)
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting new daily challenge:', insertError);
    return NextResponse.json({ error: 'Failed to create daily challenge' }, { status: 500 });
  }

  return NextResponse.json(insertedChallenge);
}
