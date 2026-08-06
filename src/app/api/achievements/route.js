import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerComponentClient({ cookies });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('title, unlocked_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching achievements for user_id:', user.id, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ achievements });
  } catch (err) {
    console.error('Unexpected error in achievement API:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
