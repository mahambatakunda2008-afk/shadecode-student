import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/challenges/complete
 * Marks a daily challenge as completed and awards XP to the user.
 * Requires challengeId in the request body.
 */
export async function POST(request) {
  const supabase = createSupabaseServerClient();
  const { challengeId } = await request.json();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!challengeId) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  // 1. Mark challenge as completed and retrieve its XP reward
  const { data: completedChallenge, error: updateError } = await supabase
    .from('daily_challenges')
    .update({ completed: true })
    .eq('id', challengeId)
    .eq('user_id', user.id) // Ensure only the owner can complete their challenge
    .eq('completed', false) // Only complete if not already completed
    .select('xp_reward') // Select XP reward to update profile
    .maybeSingle();

  if (updateError) {
    console.error('Error completing daily challenge:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!completedChallenge) {
    return NextResponse.json({ error: 'Challenge not found, already completed, or not owned by user.' }, { status: 404 });
  }

  const xpReward = completedChallenge.xp_reward || 0;

  // 2. Award XP to user profile
  // We need to fetch the current XP first to add to it.
  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .single();

  if (profileFetchError) {
    console.error('Error fetching user profile for XP update:', profileFetchError);
    return NextResponse.json({ error: profileFetchError.message }, { status: 500 });
  }

  const newXp = (profile.xp || 0) + xpReward;

  const { error: xpUpdateError } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', user.id);

  if (xpUpdateError) {
    console.error('Error updating user XP:', xpUpdateError);
    return NextResponse.json({ error: xpUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Challenge completed and XP awarded!', newXp });
}
