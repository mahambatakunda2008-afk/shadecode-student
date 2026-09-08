'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 8) { setMessage('Use at least 8 characters.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setLoading(true);
    setMessage('');
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated. Taking you to sign in…');
      setTimeout(() => router.push('/auth/login'), 900);
    }
    setLoading(false);
  };

  const input = { width: '100%', background: 'var(--muted)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '13px 14px', color: 'var(--foreground)', fontSize: 15, outline: 'none' };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '32px 20px' }}>
      <section style={{ width: '100%', maxWidth: 420 }}>
        <p style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Shadecode Student</p>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, fontWeight: 800, marginTop: 9 }}>Set a new password</h1>
        <p style={{ color: 'var(--muted-foreground)', marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>Choose a new password for your account.</p>
        {!ready ? (
          <div style={{ marginTop: 22, padding: 15, borderRadius: 12, background: 'var(--muted)', border: '1px solid var(--card-border)', color: 'var(--muted-foreground)', fontSize: 14, lineHeight: 1.5 }}>Open this page from the password reset email. If the link has expired, request a new one from sign in.</div>
        ) : (
          <div style={{ marginTop: 22, display: 'grid', gap: 11 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>New password</label>
            <input aria-label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
            <label style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Confirm password</label>
            <input aria-label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={input} />
            {message && <p role="status" style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>{message}</p>}
            <button type="button" onClick={submit} disabled={loading} style={{ marginTop: 7, padding: '14px 16px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .7 : 1 }}>{loading ? 'Updating…' : 'Update password'}</button>
          </div>
        )}
      </section>
    </main>
  );
}
