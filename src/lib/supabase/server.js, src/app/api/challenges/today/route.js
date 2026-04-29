/* src/lib/supabase/server.js */
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient(cookieStore) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.delete(name, options),
      },
    }
  );
}

/* src/app/api/challenges/today/route.js */
import { createSupabaseServerClient } from 'src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('Supabase auth error:', userError);
    return NextResponse.json({ error: 'Authentication service error' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateString = `${year}-${month}-${day}`;

  const { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', todayDateString)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means 'no rows found' for .single()
    console.error('Error fetching today\'s challenge:', error);
    return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 });
  }

  if (!challenge) {
    return NextResponse.json({ challenge: null });
  }

  return NextResponse.json({ challenge });
}
