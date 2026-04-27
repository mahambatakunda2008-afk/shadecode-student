import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const { user_id, insight_text, subject_id } = await req.json();

  if (!user_id || !insight_text) {
    return NextResponse.json({ error: 'Missing user_id or insight_text' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id,
        insight_text,
        subject_id: subject_id || null // subject_id is optional
      })
      .select();

    if (error) {
      console.error('Error inserting insight:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/cortex/insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
