import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challenge_id } = await request.json();

  if (!challenge_id) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  try {
    // 1. Mark challenge as completed
    const { data: updatedChallenge, error: updateChallengeError } = await supabase
      .from('daily_challenges')
      .update({ completed: true })
      .eq('id', challenge_id)
      .eq('user_id', user.id) // Ensure only the user can complete their own challenge
      .select()
      .single();

    if (updateChallengeError) {
      console.error('Error updating daily challenge completion:', updateChallengeError);
      return NextResponse.json({ error: updateChallengeError.message }, { status: 500 });
    }

    if (!updatedChallenge) {
      return NextResponse.json({ error: 'Challenge not found or not owned by user' }, { status: 404 });
    }

    // 2. Award XP to the user's profile
    const xpReward = updatedChallenge.xp_reward;

    const { data: profile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('xp, weekly_xp')
      .eq('id', user.id)
      .single();

    if (fetchProfileError) {
      console.error('Error fetching user profile for XP update:', fetchProfileError);
      return NextResponse.json({ error: fetchProfileError.message }, { status: 500 });
    }

    const newXp = (profile.xp || 0) + xpReward;
    const newWeeklyXp = (profile.weekly_xp || 0) + xpReward;

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ xp: newXp, weekly_xp: newWeeklyXp })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating user XP:', updateProfileError);
      return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Challenge completed and XP awarded!', xpAwarded: xpReward });

  } catch (error) {
    console.error('Unexpected error in POST /api/challenges/complete:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
