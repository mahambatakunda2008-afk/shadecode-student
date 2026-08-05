import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { challengeId } = await request.json();

  if (!challengeId) {
    return NextResponse.json({ message: 'Challenge ID is required' }, { status: 400 });
  }

  // First, get the challenge to check its status and XP reward
  const { data: challenge, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('id, xp_reward, completed')
    .eq('id', challengeId)
    .eq('user_id', user.id) // Ensure user owns the challenge
    .single();

  if (fetchError || !challenge) {
    console.error('Error fetching challenge for completion:', fetchError);
    return NextResponse.json({ message: 'Challenge not found or not authorized', error: fetchError }, { status: 404 });
  }

  if (challenge.completed) {
    return NextResponse.json({ message: 'Challenge already completed' }, { status: 200 });
  }

  // Mark challenge as completed
  const { error: updateError } = await supabase
    .from('daily_challenges')
    .update({ completed: true })
    .eq('id', challengeId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error marking challenge complete:', updateError);
    return NextResponse.json({ message: 'Error marking challenge complete', error: updateError }, { status: 500 });
  }

  // Award XP to the user by updating their profile
  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .single();

  if (profileFetchError || !profile) {
    console.error('Error fetching user profile:', profileFetchError);
    return NextResponse.json({ message: 'Challenge completed, but failed to update XP (profile not found).', error: profileFetchError }, { status: 500 });
  }

  const newXp = (profile.xp || 0) + challenge.xp_reward;

  const { error: xpUpdateError } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', user.id);

  if (xpUpdateError) {
    console.error('Error updating user XP:', xpUpdateError);
    return NextResponse.json({ message: 'Challenge completed, but failed to update XP.', error: xpUpdateError }, { status: 500 });
  }

  return NextResponse.json({ message: 'Challenge completed and XP awarded!', newXp });
}
