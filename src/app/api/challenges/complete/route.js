import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: challengeId } = await request.json();

  if (!challengeId) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  // Mark challenge as completed
  const { data: completedChallenge, error: updateError } = await supabase
    .from('daily_challenges')
    .update({ completed: true })
    .eq('id', challengeId)
    .eq('user_id', user.id) // Ensure only the owner can complete their challenge
    .select('id, xp_reward') // Select XP reward for profile update
    .single();

  if (updateError) {
    console.error('Error marking daily challenge complete:', updateError);
    return NextResponse.json({ error: 'Failed to complete daily challenge' }, { status: 500 });
  }

  if (!completedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or not owned by user' }, { status: 404 });
  }

  // Award XP to the user
  const xpReward = completedChallenge.xp_reward || 0;
  if (xpReward > 0) {
    // Fetch current XP, calculate new XP, then update
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();
    
    if (profileFetchError) {
      console.error('Error fetching user profile for XP update:', profileFetchError);
    } else if (profile) {
      const newXp = (profile.xp || 0) + xpReward;
      const { error: xpUpdateError } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', user.id);

      if (xpUpdateError) {
        console.error('Error updating user XP:', xpUpdateError);
      }
    }
  }

  return NextResponse.json({ message: 'Daily challenge completed and XP awarded!' });
}
