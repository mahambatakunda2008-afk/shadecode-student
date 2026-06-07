/**
 * POST /api/user/complete-tour
 *
 * Marks hasCompletedTour = true on the authenticated user's profile.
 *
 * Auth adapter: this example uses NextAuth + Prisma.
 * If you're on Supabase Auth, swap `getServerSession` for `createServerClient`
 * and call supabase.from('profiles').update(...).
 * If you're on Clerk, use `auth()` from @clerk/nextjs/server.
 */

import { NextResponse } from 'next/server';

// ─── Prisma + NextAuth (default adapter) ─────────────────────────────────────
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';

// ─── Supabase Auth adapter ────────────────────────────────────────────────────
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';

export async function POST(): Promise<NextResponse> {
  try {
    // ── NextAuth + Prisma ─────────────────────────────────────────────────────
    //
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    //
    // await prisma.userProfile.update({
    //   where:  { userId: session.user.id },
    //   data:   { hasCompletedTour: true },
    // });
    //
    // return NextResponse.json({ ok: true });

    // ── Supabase Auth ─────────────────────────────────────────────────────────
    //
    // const supabase = createRouteHandlerClient({ cookies });
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    //
    // await supabase
    //   .from('profiles')
    //   .update({ has_completed_tour: true })
    //   .eq('id', session.user.id);
    //
    // return NextResponse.json({ ok: true });

    // ── Clerk ─────────────────────────────────────────────────────────────────
    //
    // import { auth } from '@clerk/nextjs/server';
    // const { userId } = auth();
    // if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    //
    // await prisma.userProfile.update({
    //   where:  { clerkUserId: userId },
    //   data:   { hasCompletedTour: true },
    // });
    //
    // return NextResponse.json({ ok: true });

    // ── REMOVE THIS STUB once you wire in your auth ───────────────────────────
    return NextResponse.json({ ok: true, note: 'Stub — wire auth adapter above.' });
  } catch (err) {
    console.error('[complete-tour]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
