import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7).trim() || null : null;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server credentials.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * POST /api/user/complete-tour
 * Marks the onboarding tour as completed for the authenticated user.
 *
 * Previously accepted a client-supplied userId with no auth check at all --
 * an IDOR shape (any caller could claim any userId) that happened to be
 * harmless only because the persistence layer was never wired up (see the
 * removed TODO below). Fixed to derive the user from the session instead
 * of trusting the request body, so this is safe the moment persistence is
 * added. See docs/audits/2026-08-24-security-audit.md.
 */
export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // TODO: integrate with the persistence layer (e.g. profiles.tour_completed_at)
    // to actually record completion for user.id. Currently a no-op response.
    return NextResponse.json({ success: true, userId: user.id }, { status: 200 });
  } catch (error) {
    console.error('[complete-tour] error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
