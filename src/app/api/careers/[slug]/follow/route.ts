import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCareerBySlug } from '@/lib/careers';
import { followCareer, unfollowCareer } from '@/lib/careers/user';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : 'follow';
    const { slug } = await params;

    const careerResult = await getCareerBySlug(slug);
    if (!careerResult || !careerResult.career) {
      return new NextResponse(JSON.stringify({ error: 'Career not found' }), { status: 404 });
    }

    const careerId = careerResult.career.id;

    if (action === 'follow') {
      await followCareer(user.id, careerId);
    } else {
      await unfollowCareer(user.id, careerId);
    }

    return NextResponse.json({ ok: true, action, slug });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('career follow error', err);
    return new NextResponse(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
