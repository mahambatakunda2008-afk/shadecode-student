import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ enrolled: [] });

    const { data, error } = await supabase
      .from('user_profiles')
      .select('enrolled_courses')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[catalog/enroll] fetch error:', error);
      return NextResponse.json({ enrolled: [] });
    }

    const enrolled: string[] = (data?.enrolled_courses) ?? [];
    return NextResponse.json({ enrolled });
  } catch (err) {
    console.error('[catalog/enroll] unexpected', err);
    return NextResponse.json({ enrolled: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseId = body?.courseId;
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch existing enrolled array
    const { data, error } = await supabase
      .from('user_profiles')
      .select('enrolled_courses')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[catalog/enroll] read error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const enrolled: string[] = (data?.enrolled_courses) ?? [];
    const exists = enrolled.includes(courseId);
    const newEnrolled = exists ? enrolled.filter((c) => c !== courseId) : [...enrolled, courseId];

    const { error: upsertErr } = await supabase.from('user_profiles').upsert({ user_id: user.id, enrolled_courses: newEnrolled }, { onConflict: 'user_id' });
    if (upsertErr) {
      console.error('[catalog/enroll] upsert error:', upsertErr);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ enrolled: newEnrolled });
  } catch (err) {
    console.error('[catalog/enroll] unexpected', err);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
