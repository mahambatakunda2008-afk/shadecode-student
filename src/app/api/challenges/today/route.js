import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// A set of simple challenge ideas for initial generation
const CHALLENGE_IDEAS = [
  { title: 'Complete a task', description: 'Mark any task as completed today.', xp_reward: 50 },
  { title: 'Study for 30 minutes', description: 'Log at least 30 minutes of study time.', xp_reward: 75 },
  { title: 'Create a new subject', description: 'Add a new subject to your learning path.', xp_reward: 40 },
  { title: 'Review a study topic', description: 'Visit and reflect on an existing study topic.', xp_reward: 60 },
  { title: 'Plan your day', description: 'Add at least one entry to your timetable.', xp_reward: 30 },
];

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  try {
    // Try to find an incomplete challenge for today
    let { data: challenge, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Supabase error fetching daily challenge:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (challenge) {
      return NextResponse.json({ challenge }, { status: 200 });
    }

    // If no challenge found for today, create one
    const newChallengeData = CHALLENGE_IDEAS[Math.floor(Math.random() * CHALLENGE_IDEAS.length)];

    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        user_id: user.id,
        title: newChallengeData.title,
        description: newChallengeData.description,
        xp_reward: newChallengeData.xp_reward,
        completed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase error creating daily challenge:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ challenge: newChallenge }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in daily challenge API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
