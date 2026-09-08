'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function VerifyPage() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setMessage(error ? error.message : 'Verification email sent. Check your inbox.');
    setLoading(false);
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '32px 20px' }}>
      <section style={{ width: '100%', maxWidth: 420 }}>
        <p style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Shadecode Student</p>
        <h1 style={{ fontSize: 30, lineHeight: 1.12, fontWeight: 800, marginTop: 9 }}>Check your email.</h1>
        <p style={{ color: 'var(--muted-foreground)', marginTop: 10, fontSize: 15, lineHeight: 1.55 }}>We sent a verification link{email ? <> to <strong style={{ color: 'var(--foreground)' }}>{email}</strong></> : ''}. Verify your account, then sign in to continue your setup.</p>
        <div style={{ marginTop: 22, padding: 15, borderRadius: 12, background: 'var(--muted)', border: '1px solid var(--card-border)', fontSize: 13, lineHeight: 1.5 }}>No email yet? Check spam, or resend it below.</div>
        <button type="button" onClick={resend} disabled={!email || loading} style={{ width: '100%', marginTop: 12, padding: '13px 16px', borderRadius: 11, border: '1px solid var(--card-border)', background: 'var(--card)', color: 'var(--foreground)', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .7 : 1 }}>{loading ? 'Sending…' : 'Resend verification email'}</button>
        {message && <p role="status" style={{ marginTop: 10, fontSize: 12, color: 'var(--muted-foreground)' }}>{message}</p>}
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--muted-foreground)' }}><Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Back to sign in</Link></p>
      </section>
    </main>
  );
}
