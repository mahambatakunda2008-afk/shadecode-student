import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with service role key for server-side operations.
// This key provides elevated privileges and should be securely handled in a production environment.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Using service role key for direct DB writes in API routes
);

export async function POST(request) {
  try {
    const { user_id, subject_id, content, type } = await request.json();

    if (!user_id || !content) {
      return NextResponse.json({ error: 'User ID and content are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id,
        subject_id: subject_id || null, // Ensure subject_id is null if not provided
        content,
        type: type || 'neutral' // Default to 'neutral' type if not specified
      })
      .select();

    if (error) {
      console.error('Error inserting insight:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });

  } catch (error) {
    console.error('Unexpected error in /api/cortex/insight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
