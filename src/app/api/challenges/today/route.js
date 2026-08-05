import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Assuming 'daily_challenges' table has columns: id, user_id, title, description, xp_reward, completed, created_at
  const { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', false)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .single(); // Use .single() to get one challenge for the day, or null

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenge });
}
