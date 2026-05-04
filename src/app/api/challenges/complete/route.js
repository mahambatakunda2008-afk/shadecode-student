import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challenge_id } = await request.json();

  if (!challenge_id) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  try {
    // 1. Mark the challenge as completed
    const { data: updatedChallenge, error: updateChallengeError } = await supabase
      .from('daily_challenges')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', challenge_id)
      .eq('user_id', user.id)
      .select('xp_reward')
      .single();

    if (updateChallengeError) {
      console.error('Supabase error updating daily challenge:', updateChallengeError);
      return NextResponse.json({ error: updateChallengeError.message }, { status: 500 });
    }

    if (!updatedChallenge) {
      return NextResponse.json({ error: 'Challenge not found or already completed by this user' }, { status: 404 });
    }

    // 2. Award XP to the user's profile and update streak
    const { xp_reward } = updatedChallenge;
    const { data: profile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('xp, streak, last_active')
      .eq('id', user.id)
      .single();
    
    if (fetchProfileError) {
      console.error('Supabase error fetching user profile:', fetchProfileError);
      return NextResponse.json({ error: fetchProfileError.message }, { status: 500 });
    }

    let newStreak = profile.streak || 0;
    const todayString = new Date().toISOString().split('T')[0];
    const lastActiveDateString = profile.last_active ? new Date(profile.last_active).toISOString().split('T')[0] : null;
    
    if (lastActiveDateString !== todayString) { // Only update streak if not active today already
      const lastActiveDay = new Date(profile.last_active);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      if (lastActiveDateString === yesterdayString) {
        newStreak = (profile.streak || 0) + 1;
      } else if (lastActiveDateString === null || lastActiveDateString < yesterdayString) {
        newStreak = 1; // Streak broken or first activity
      } else { // future date, or same day activity
        newStreak = profile.streak || 0; // Maintain current streak if already active today
      }
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ xp: profile.xp + xp_reward, streak: newStreak, last_active: new Date().toISOString() })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Supabase error updating user profile:', updateProfileError);
      return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Challenge completed successfully', xp_awarded: xp_reward }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in complete challenge API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
