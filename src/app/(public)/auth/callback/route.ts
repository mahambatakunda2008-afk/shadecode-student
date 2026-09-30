import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/onboarding';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=verification_failed', requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData.user) {
    return NextResponse.redirect(new URL('/auth/login?error=verification_failed', requestUrl.origin));
  }

  // Email verification creates the session, but the user may already have
  // completed onboarding. Resolve that state server-side instead of always
  // forcing returning users through setup again.
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('user_id', sessionData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[auth/callback] profile lookup failed:', profileError);
    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
  }

  const destination = safeNext !== '/onboarding'
    ? safeNext
    : profile?.onboarding_completed === true
      ? '/dashboard'
      : '/onboarding';

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
