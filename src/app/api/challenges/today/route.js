import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if a daily challenge already exists for today for this user
  // Assuming 'daily_challenges' table has 'user_id', 'created_at', 'title', 'description', 'xp_reward', 'completed', 'completed_at' columns.
  let { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', today + 'T00:00:00Z') // Start of today (UTC)
    .lte('created_at', today + 'T23:59:59Z') // End of today (UTC)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (expected if no challenge yet)
    console.error('Error fetching daily challenge:', error.message);
    return NextResponse.json({ error: 'Failed to fetch daily challenge' }, { status: 500 });
  }

  if (!challenge) {
    // No challenge for today, create a default one
    const newChallenge = {
      user_id: user.id,
      title: 'Complete 1 Study Session',
      description: 'Log at least 30 minutes of study time in any subject to complete this challenge.',
      xp_reward: 50,
      completed: false,
      created_at: new Date().toISOString(),
    };

    const { data: insertedChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert(newChallenge)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting new daily challenge:', insertError.message);
      return NextResponse.json({ error: 'Failed to create daily challenge' }, { status: 500 });
    }
    challenge = insertedChallenge;
  }

  return NextResponse.json(challenge);
}

export async function POST(request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challengeId } = await request.json();

  // Mark challenge as completed
  const { data: completedChallenge, error: updateError } = await supabase
    .from('daily_challenges')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', challengeId)
    .eq('user_id', user.id) // Ensure only the owner can complete their challenge
    .select()
    .single();

  if (updateError) {
    console.error('Error completing daily challenge:', updateError.message);
    return NextResponse.json({ error: 'Failed to complete daily challenge' }, { status: 500 });
  }

  if (!completedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or not owned by user' }, { status: 404 });
  }

  // Award XP to the user's profile
  const xpReward = completedChallenge.xp_reward;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id) // User's profile ID matches auth ID
    .single();

  if (profileError) {
    console.error('Error fetching profile for XP update:', profileError.message);
    return NextResponse.json({ error: 'Failed to update user XP' }, { status: 500 });
  }

  const newXp = (profile.xp || 0) + xpReward;
  const { error: xpUpdateError } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', user.id);

  if (xpUpdateError) {
    console.error('Error updating user XP:', xpUpdateError.message);
    return NextResponse.json({ error: 'Failed to update user XP' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Challenge completed and XP awarded!', xpAwarded: xpReward });
}
