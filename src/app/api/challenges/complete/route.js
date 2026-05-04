import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challenge_id } = await request.json();

  if (!challenge_id) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  // Fetch the challenge to get XP reward and check completion status
  const { data: challenge, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('xp_reward, completed')
    .eq('id', challenge_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    console.error('Error fetching challenge for completion:', fetchError);
    return NextResponse.json({ error: 'Challenge not found or unauthorized' }, { status: 404 });
  }

  if (challenge.completed) {
    return NextResponse.json({ message: 'Challenge already completed' }, { status: 200 });
  }

  // Mark challenge as completed
  const { error: updateChallengeError } = await supabase
    .from('daily_challenges')
    .update({ completed: true })
    .eq('id', challenge_id)
    .eq('user_id', user.id);

  if (updateChallengeError) {
    console.error('Error updating daily challenge:', updateChallengeError);
    return NextResponse.json({ error: 'Failed to complete challenge' }, { status: 500 });
  }

  // Award XP to the user
  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ xp: Math.round(Math.random() * 20) + challenge.xp_reward }) // Added some randomness to XP reward
    .eq('id', user.id);

  if (updateProfileError) {
    console.error('Error updating user XP:', updateProfileError);
    // Even if XP update fails, challenge is marked complete. Consider adding robust transaction handling if critical.
  }

  return NextResponse.json({ message: 'Challenge completed successfully!', xp_awarded: challenge.xp_reward });
}
