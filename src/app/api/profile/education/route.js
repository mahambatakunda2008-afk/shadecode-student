import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { study_level, education_details } = await request.json();

  // Stringify the education_details JSON for storage in the 'subjects' text column.
  // Ensure education_details is an array or defaults to empty for proper JSON structure.
  const subjectsJson = JSON.stringify(education_details || []);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        study_level: study_level, 
        // Store detailed education info in the 'subjects' column as a JSON string
        subjects: subjectsJson 
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Unexpected error in PUT /api/profile/education:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
