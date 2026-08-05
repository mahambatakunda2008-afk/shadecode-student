import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Placeholder challenges - In a real app, these might be dynamically generated or come from a database
const CHALLENGE_TEMPLATES = [
  { title: 'Study for 30 minutes', description: 'Complete a study session of at least 30 minutes.', xp_reward: 50 },
  { title: 'Review last week\'s tasks', description: 'Mark at least 3 tasks from last week as reviewed.', xp_reward: 40 },
  { title: 'Complete a new task', description: 'Add and complete any new task in a subject.', xp_reward: 30 },
  { title: 'Plan your next study session', description: 'Add a new entry to your timetable.', xp_reward: 25 },
  { title: 'Explore a new subject', description: 'Create a new subject in your profile.', xp_reward: 35 },
];

export async function GET() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Check for an existing challenge for today
  const { data: existingChallenge, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .gte('challenge_date', today.toISOString())
    .lt('challenge_date', tomorrow.toISOString())
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching daily challenge:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 });
  }

  if (existingChallenge) {
    return NextResponse.json(existingChallenge);
  }

  // If no challenge for today, generate a new one
  const randomIndex = Math.floor(Math.random() * CHALLENGE_TEMPLATES.length);
  const newChallengeData = CHALLENGE_TEMPLATES[randomIndex];

  const { data: newChallenge, error: insertError } = await supabase
    .from('daily_challenges')
    .insert({
      user_id: user.id,
      title: newChallengeData.title,
      description: newChallengeData.description,
      xp_reward: newChallengeData.xp_reward,
      completed: false,
      challenge_date: today.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting new daily challenge:', insertError);
    return NextResponse.json({ error: 'Failed to generate new challenge' }, { status: 500 });
  }

  return NextResponse.json(newChallenge);
}
