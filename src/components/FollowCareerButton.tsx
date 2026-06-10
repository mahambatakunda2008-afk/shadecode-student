"use client";
import { useEffect, useState } from 'react';

export default function FollowCareerButton({ slug }: { slug: string }) {
  const [careerId, setCareerId] = useState<string | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const r = await fetch(`/api/careers/${slug}`);
        const j = await r.json();
        const id = j?.career?.id ?? j?.career?.id ?? j?.id ?? null;
        if (!id) return;
        if (!mounted) return;
        setCareerId(id);

        const f = await fetch('/api/careers/following');
        if (f.status === 401) { setFollowing(false); return; }
        const fj = await f.json();
        const list = fj?.careers ?? []; 
        const isFollowing = list.some((c: any) => c.id === id || c.slug === slug);
        if (mounted) setFollowing(isFollowing);
      } catch (e: any) { if (mounted) setError(e?.message ?? 'Failed'); }
    }
    init();
    return () => { mounted = false; };
  }, [slug]);

  async function toggle() {
    if (!careerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/careers/${slug}/follow`, { method: 'POST' });
      const j = await res.json();
      if (res.ok) {
        setFollowing(!!j.following);
      } else {
        setError(j?.error ?? 'Failed');
      }
    } catch (e: any) { setError(e?.message ?? 'Failed'); }
    setLoading(false);
  }

  if (following === null) return <button disabled>Loading...</button>;
  return (
    <div style={{ display: 'inline-block', marginLeft: 12 }}>
      <button onClick={toggle} disabled={loading} style={{ padding: '8px 12px' }}>{following ? 'Following' : 'Follow'}</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
