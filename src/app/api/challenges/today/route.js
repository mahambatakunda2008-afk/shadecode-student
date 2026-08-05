import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Check if a challenge already exists for the user today
  let { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('challenge_date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json({ message: 'Error fetching challenge', error }, { status: 500 });
  }

  // If no challenge exists for today, create a new one
  if (!challenge) {
    const defaultChallenges = [
      { title: 'Study for 30 minutes', description: 'Dedicate 30 minutes to any subject today.', xp_reward: 50 },
      { title: 'Review 5 flashcards', description: 'Go over 5 flashcards from any subject.', xp_reward: 20 },
      { title: 'Complete 1 task', description: 'Mark one of your study tasks as complete.', xp_reward: 30 },
      { title: 'Log a new study topic', description: 'Add a new topic to study in any subject.', xp_reward: 25 },
    ];
    const randomIndex = Math.floor(Math.random() * defaultChallenges.length);
    const selectedChallenge = defaultChallenges[randomIndex];

    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        user_id: user.id,
        title: selectedChallenge.title,
        description: selectedChallenge.description,
        xp_reward: selectedChallenge.xp_reward,
        completed: false,
        challenge_date: today,
      })
      .select('*') // Select the inserted row
      .single();

    if (insertError) {
      console.error('Error creating new daily challenge:', insertError);
      return NextResponse.json({ message: 'Error creating challenge', error: insertError }, { status: 500 });
    }
    challenge = newChallenge;
  }

  return NextResponse.json(challenge);
}
