import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listUserCareers } from '@/lib/careers/user';

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const careers = await listUserCareers(user.id);
    return NextResponse.json({ ok: true, following: careers });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('career following list error', err);
    return new NextResponse(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
