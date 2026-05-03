import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables! Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  // For production, you might want to throw an error or handle this more gracefully.
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to generate a random challenge (can be expanded with more sophisticated logic later)
const generateRandomChallenge = () => {
  const challenges = [
    { title: "Solve 5 tasks", description: "Complete 5 tasks today to earn extra XP.", xp_reward: 50 },
    { title: "Study for 30 minutes", description: "Log 30 minutes of study time in any subject.", xp_reward: 75 },
    { title: "Create a new subject", description: "Add a new subject to your learning path.", xp_reward: 25 },
    { title: "Complete 1 exam", description: "Successfully finish one exam today.", xp_reward: 100 },
    { title: "Plan your day", description: "Add at least 3 items to your timetable.", xp_reward: 40 },
  ];
  return challenges[Math.floor(Math.random() * challenges.length)];
};

export async function GET(request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  const userId = user.id;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if a challenge already exists for today for this user
  const { data: existingChallenge, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is an expected scenario
    console.error('Error fetching existing daily challenge:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (existingChallenge) {
    return NextResponse.json(existingChallenge);
  }

  // If no challenge exists for today, create a new one
  const newChallengeData = generateRandomChallenge();
  const { data: createdChallenge, error: createError } = await supabase
    .from('daily_challenges')
    .insert({
      user_id: userId,
      challenge_title: newChallengeData.title,
      challenge_description: newChallengeData.description,
      xp_reward: newChallengeData.xp_reward,
      completed: false, // New challenges always start as uncompleted
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating new daily challenge:', createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json(createdChallenge);
}

export async function POST(request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  const userId = user.id;
  const { challengeId } = await request.json();

  if (!challengeId) {
    return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
  }

  // Mark the challenge as completed
  const { data: updatedChallenge, error: updateError } = await supabase
    .from('daily_challenges')
    .update({ completed: true })
    .eq('id', challengeId)
    .eq('user_id', userId) // Ensure the user owns this challenge
    .select('xp_reward') // Only select xp_reward for subsequent update
    .single();

  if (updateError) {
    console.error('Error updating daily challenge status:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updatedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or not owned by user' }, { status: 404 });
  }

  // Fetch current user XP and update it
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile for XP update:', profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const newXp = (profile.xp || 0) + updatedChallenge.xp_reward;

  const { error: xpUpdateError } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', userId);

  if (xpUpdateError) {
    console.error('Error updating user XP:', xpUpdateError);
    return NextResponse.json({ error: xpUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Challenge completed and XP awarded!', newXp });
}