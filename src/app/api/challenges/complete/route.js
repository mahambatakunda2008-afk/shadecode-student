import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challengeId } = await request.json();

  if (!challengeId) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  // 1. Fetch challenge to get XP reward and ensure it belongs to the user
  const { data: challenge, error: fetchChallengeError } = await supabase
    .from('daily_challenges')
    .select('xp_reward, completed')
    .eq('id', challengeId)
    .eq('user_id', user.id)
    .single();

  if (fetchChallengeError) {
    console.error('Error fetching challenge:', fetchChallengeError);
    return NextResponse.json({ error: 'Challenge not found or does not belong to user' }, { status: 404 });
  }

  if (challenge.completed) {
    return NextResponse.json({ message: 'Challenge already completed' }, { status: 200 });
  }

  // 2. Mark challenge as completed
  const { error: updateChallengeError } = await supabase
    .from('daily_challenges')
    .update({ completed: true })
    .eq('id', challengeId)
    .eq('user_id', user.id);

  if (updateChallengeError) {
    console.error('Error marking challenge complete:', updateChallengeError);
    return NextResponse.json({ error: 'Failed to mark challenge complete' }, { status: 500 });
  }

  // 3. Award XP to user
  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({
      xp: `xp + ${challenge.xp_reward}`,
      weekly_xp: `weekly_xp + ${challenge.xp_reward}`,
    })
    .eq('id', user.id);

  if (updateProfileError) {
    console.error('Error updating user XP:', updateProfileError);
    // Note: In a production app, you might want to revert the challenge completion if XP update fails.
    return NextResponse.json({ error: 'Challenge completed, but failed to award XP' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Challenge completed successfully!', xpAwarded: challenge.xp_reward });
}
