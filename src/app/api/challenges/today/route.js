import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
};

export async function GET(request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Define a default/placeholder daily challenge for demonstration.
  // In a real scenario, this would be fetched from the 'daily_challenges' table.
  // Since the 'daily_challenges' table is empty and we cannot modify its schema
  // to include user-specific completion, we provide a consistent placeholder.
  const defaultChallenge = {
    id: 'daily-coding-sprint',
    title: 'Code Sprint: 30 Minutes on a Topic',
    description: 'Dedicate 30 minutes to coding on any subject of your choice. Focus on active learning!',
    xp_reward: 100,
  };

  try {
    // --- IMPORTANT LIMITATION NOTE ---
    // Due to the constraint of 'NEVER create SQL migrations or try to fix table schemas',
    // we cannot create a 'user_daily_challenges' table or add 'completed_at' / 'user_id'
    // columns to the existing 'daily_challenges' table. Therefore, the server cannot
    // persistently track if a specific user has completed today's challenge.
    // The `isCompleted` status will be managed on the frontend using localStorage
    // for session-level persistence and visual feedback.
    // In a production scenario without these constraints, the GET request would
    // also check a user's completion status for the daily challenge.

    // For now, return the default challenge and assume it's not completed from the server's perspective.
    return NextResponse.json({
      challenge: defaultChallenge,
      isCompleted: false, // Frontend will manage this for the current session/day locally.
    });
  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json({ error: 'Failed to fetch daily challenge' }, { status: 500 });
  }
}

export async function POST(request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challengeId, xpReward } = await request.json();

  if (!challengeId || typeof xpReward !== 'number') {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  try {
    // --- IMPORTANT LIMITATION NOTE ---
    // As mentioned in the GET handler, due to schema constraints, this API cannot
    // persistently track if a user has already completed a challenge for the day.
    // Therefore, this endpoint will award XP on every successful POST request.
    // The frontend component is responsible for preventing multiple completions
    // *within a single user session* using local state and localStorage.
    // A robust system would include a server-side check for prior completion.

    // Fetch current user profile to get their current XP
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for XP update:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    } else if (profile.xp === null || profile.xp === undefined) {
        // Handle case where xp might be null initially
        profile.xp = 0;
    }

    // Award XP
    const newXp = profile.xp + xpReward;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ xp: newXp })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating XP:', updateError);
      return NextResponse.json({ error: 'Failed to update XP' }, { status: 500 });
    }

    return NextResponse.json({ success: true, newXp });

  } catch (error) {
    console.error('Error completing daily challenge:', error);
    return NextResponse.json({ error: 'Failed to complete daily challenge' }, { status: 500 });
  }
}
