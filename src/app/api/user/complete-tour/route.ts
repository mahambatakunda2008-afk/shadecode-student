/**
 * POST /api/user/complete-tour
 *
 * Called by TourContext (completeTourAction) when the user finishes or skips
 * the tour. Sets tourCompleted = true on UserProfile.
 *
 * This is a best-effort write — localStorage is the primary guard.
 * A 500 here will NOT prevent the tour from being dismissed on the client.
 */

import { NextResponse } from 'next/server';

// ── Uncomment your adapter ────────────────────────────────────────────────────
// import { getServerSession }  from 'next-auth';
// import { authOptions }       from '@/lib/auth';
// import { prisma }            from '@/lib/prisma';

// ── Supabase ──────────────────────────────────────────────────────────────────
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies }                  from 'next/headers';

// ── Clerk ─────────────────────────────────────────────────────────────────────
// import { auth }  from '@clerk/nextjs/server';
// import { prisma } from '@/lib/prisma';

export async function POST(): Promise<NextResponse> {
  try {

    // ── NextAuth + Prisma ─────────────────────────────────────────────────────
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // await prisma.userProfile.update({
    //   where: { userId: session.user.id },
    //   data:  { tourCompleted: true },
    // });

    // ── Supabase ──────────────────────────────────────────────────────────────
    // const supabase = createRouteHandlerClient({ cookies });
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // await supabase.from('profiles')
    //   .update({ tour_completed: true })
    //   .eq('id', session.user.id);

    // ── Clerk + Prisma ────────────────────────────────────────────────────────
    // const { userId } = auth();
    // if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // await prisma.userProfile.update({
    //   where: { userId },
    //   data:  { tourCompleted: true },
    // });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[complete-tour] DB write failed:', err);
    // Return 200 anyway — client doesn't need to know about this failure
    return NextResponse.json({ ok: true });
  }
}
