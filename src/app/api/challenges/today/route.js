import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Try to find today's challenge for the user
  let { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('date_assigned', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means 'no rows found'
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 });
  }

  // If no challenge exists for today, create one
  if (!challenge) {
    const newChallengeData = {
      user_id: user.id,
      title: 'Complete a study session',
      description: 'Engage in a focused study session for at least 30 minutes on any subject.',
      xp_reward: 50,
      completed: false,
      date_assigned: today,
    };

    const { data: newChallenge, error: createError } = await supabase
      .from('daily_challenges')
      .insert(newChallengeData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating daily challenge:', createError);
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
    }
    challenge = newChallenge;
  }

  return NextResponse.json(challenge);
}
