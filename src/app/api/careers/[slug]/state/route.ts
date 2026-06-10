import { NextResponse } from 'next/server';
import { getCareerState } from '@/lib/careers/state';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const slug = parts[parts.length - 3]; // /api/careers/[slug]/state

    if (!slug) return NextResponse.json({ error: 'missing slug' }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const state = await getCareerState(slug, data.user.id);
    if (!state) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, state });
  } catch (e: any) {
    console.error('career state error', e);
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 });
  }
}
