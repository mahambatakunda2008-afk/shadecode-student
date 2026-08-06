import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Get the user session to identify the logged-in user
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // If no session, the user is not authenticated
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id; // Extract the user_id from the session

  try {
    // Fetch achievements for the identified user from the 'achievements' table
    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('id, title, unlocked_at')
      .eq('user_id', userId) // Filter by user_id
      .order('unlocked_at', { ascending: false }); // Order by unlock date

    if (error) {
      console.error('Supabase error fetching achievements:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the fetched achievements
    return NextResponse.json(achievements, { status: 200 });
  } catch (err) {
    console.error('Unexpected error fetching achievements:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
