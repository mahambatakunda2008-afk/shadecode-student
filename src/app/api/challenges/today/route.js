import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getSupabaseServerClient() {
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
}

export async function GET(request) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

  const { data: challenge, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching daily challenge:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch daily challenge' }, { status: 500 });
  }

  if (challenge) {
    return NextResponse.json(challenge);
  } else {
    // No challenge for today, create a default one
    const defaultChallenge = {
      user_id: userId,
      title: 'Complete a study session!',
      description: 'Study for at least 30 minutes in any subject.',
      xp_reward: 50,
      completed: false,
      created_at: new Date().toISOString(),
    };

    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert(defaultChallenge)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating daily challenge:', insertError);
      return NextResponse.json({ error: 'Failed to create daily challenge' }, { status: 500 });
    }
    return NextResponse.json(newChallenge);
  }
}
