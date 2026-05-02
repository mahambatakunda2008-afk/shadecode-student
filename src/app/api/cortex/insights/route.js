import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { insight_text, source_context } = await req.json();

  if (!insight_text) {
    return NextResponse.json({ error: 'Insight text is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id: user.id,
        insight_text,
        source_context: source_context || null
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('Error storing insight:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
