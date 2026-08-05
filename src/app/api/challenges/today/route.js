import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client (ensure these are set in your .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const challengesList = [
  { title: 'Study for 30 minutes', description: 'Dedicate 30 minutes to any subject.', xp_reward: 50 },
  { title: 'Complete 2 tasks', description: 'Finish any two pending tasks.', xp_reward: 75 },
  { title: 'Review 5 topics', description: 'Revisit 5 study topics you've covered.', xp_reward: 60 },
  { title: 'Plan your next study session', description: 'Create a new entry in your timetable.', xp_reward: 40 },
  { title: 'Explore a new subject', description: 'Spend 15 minutes learning about a new subject.', xp_reward: 55 },
];

export async function GET(request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day UTC
  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // 1. Check if a challenge already exists for today for this user
    const { data: existingChallenge, error: fetchError } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('challenge_date', todayISO) // Assuming challenge_date is DATE type
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching daily challenge:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existingChallenge) {
      return NextResponse.json(existingChallenge);
    }

    // 2. If no challenge exists, create a new one
    const randomChallenge = challengesList[Math.floor(Math.random() * challengesList.length)];

    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        user_id: user.id,
        title: randomChallenge.title,
        description: randomChallenge.description,
        xp_reward: randomChallenge.xp_reward,
        challenge_date: todayISO,
        completed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting new daily challenge:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newChallenge);

  } catch (error) {
    console.error('Unexpected error in GET /api/challenges/today:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
