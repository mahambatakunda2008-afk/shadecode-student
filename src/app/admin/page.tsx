"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
      setData(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
    return session.access_token;
  }, [supabase]);

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/cortex?action=get_drafts', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load drafts');
      setDrafts(Array.isArray(json) ? json : []);
      setActionError(null);
    } catch (e) {
      console.error(e);
      setDrafts([]);
      setActionError(e instanceof Error ? e.message : 'Failed to load drafts');
    } finally {
      setDraftsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void fetchFeedback();
    void fetchDrafts();
    const interval = setInterval(() => {
      void fetchFeedback();
      void fetchDrafts();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchFeedback, fetchDrafts]);

  const grouped = {
    bug: data.filter((d) => d.type === "bug"),
    feature: data.filter((d) => d.type === "feature"),
    general: data.filter((d) => d.type === "general"),
  };

  const approve = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/cortex?action=approve_draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Approval failed');
      await fetchDrafts();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Admin Dashboard 📊</h1>
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <Stat label="Total" value={data.length} />
        <Stat label="Bugs" value={grouped.bug.length} />
        <Stat label="Features" value={grouped.feature.length} />
        <Stat label="General" value={grouped.general.length} />
      </div>
      {actionError && <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#fff1f2', color: '#9f1239' }}>{actionError}</div>}
      <div style={{ marginTop: 24 }}>
        {loading ? <p>Loading feedback...</p> : data.length === 0 ? <p>No feedback yet.</p> : data.map((item) => (
          <div key={item.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 10, background: "white" }}>
            <div style={{ fontWeight: 700 }}>{String(item.type || 'general').toUpperCase()}</div>
            <p style={{ marginTop: 6 }}>{item.message}</p>
            <small style={{ color: "gray" }}>{new Date(item.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
      <section style={{ marginTop: 40 }}>
        <h2>Generated Course Drafts</h2>
        {draftsLoading ? <p>Loading drafts...</p> : drafts.length === 0 ? <p>No drafts found.</p> : drafts.map((d) => (
          <div key={d.id} style={{ border: '1px solid #eee', padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>{d.draft?.title ?? 'Untitled'}</div>
            <div style={{ color: 'gray', fontSize: 12 }}>{d.created_at} — user: {d.user_id ?? d.userId ?? 'unknown'}</div>
            <p>{d.draft?.description}</p>
            <button onClick={() => void approve(d.id)} disabled={busyId === d.id}>{busyId === d.id ? 'Approving…' : 'Approve'}</button>
            {d.moderationIssues?.length > 0 && <div style={{ marginTop: 8, color: 'orange' }}><strong>Moderation issues:</strong><ul>{d.moderationIssues.map((m: any, i: number) => <li key={i}>{m}</li>)}</ul></div>}
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, minWidth: 100, textAlign: "center" }}><div style={{ fontSize: 12, color: "gray" }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div></div>;
}
