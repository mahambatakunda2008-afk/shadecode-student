import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challengeId } = await request.json();

  if (!challengeId) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  // 1. Mark the challenge as completed
  const { data: updatedChallenge, error: challengeUpdateError } = await supabase
    .from('daily_challenges')
    .update({ completed: true }) // Assuming 'completed' boolean column exists
    .eq('id', challengeId)
    .eq('user_id', user.id) // Ensure only the user's own challenge can be completed
    .select() // Select the updated row to get xp_reward
    .single();

  if (challengeUpdateError) {
    console.error('Error updating daily challenge:', challengeUpdateError);
    return NextResponse.json({ error: 'Failed to complete challenge' }, { status: 500 });
  }

  if (!updatedChallenge) {
    // This might happen if the challenge ID is wrong or belongs to another user
    return NextResponse.json({ error: 'Challenge not found or not belonging to user' }, { status: 404 });
  }

  // 2. Award XP to the user
  const xpReward = updatedChallenge.xp_reward || 0; // Assuming 'xp_reward' column exists

  // Fetch current XP from user profile
  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .single();

  if (profileFetchError) {
    console.error('Error fetching user profile for XP update:', profileFetchError);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }

  const newXp = (profile.xp || 0) + xpReward;

  // Update user's XP in the profiles table
  const { error: xpUpdateError } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', user.id);

  if (xpUpdateError) {
    console.error('Error updating user XP:', xpUpdateError);
    return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Challenge completed and XP awarded!', newXp, xpAwarded: xpReward }, { status: 200 });
}
