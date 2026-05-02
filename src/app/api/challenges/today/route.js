// src/app/api/challenges/today/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const defaultChallenge = {
  id: 'daily-default',
  title: 'Focus Sprint: 30 Minutes',
  description: 'Dedicate 30 uninterrupted minutes to your hardest subject today.',
  xp_reward: 50,
};

export async function GET() {
  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .limit(1)
      .single();

    const challenge = (!error && data) ? data : defaultChallenge;
    return NextResponse.json({ challenge });
  } catch (err) {
    console.error('GET /api/challenges/today error:', err);
    return NextResponse.json({ challenge: defaultChallenge });
  }
}

export async function POST(req) {
  try {
    const supabase = getSupabase();
    const { userId, xpReward } = await req.json();

    if (!userId || typeof xpReward !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const newXp = (profile.xp || 0) + xpReward;
    const newLevel = Math.floor(newXp / 100) + 1;

    await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('id', userId);

    return NextResponse.json({ success: true, newXp, newLevel });
  } catch (err) {
    console.error('POST /api/challenges/today error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
