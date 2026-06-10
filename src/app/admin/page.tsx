"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFeedback = async () => {
    try {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      setData(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch('/api/cortex?action=get_drafts');
      const arr = await res.json();
      setDrafts(Array.isArray(arr) ? arr : []);
    } catch (e) { console.error(e); setDrafts([]); }
    setDraftsLoading(false);
  };

  useEffect(() => {
    fetchFeedback();

    // SIMPLE POLLING (NO SUPABASE REALTIME SETUP NEEDED)
    const interval = setInterval(() => {
      fetchFeedback();
      fetchDrafts();
    }, 5000);

    fetchDrafts();

    return () => clearInterval(interval);
  }, []);

  const grouped = {
    bug: data.filter((d) => d.type === "bug"),
    feature: data.filter((d) => d.type === "feature"),
    general: data.filter((d) => d.type === "general"),
  };

  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    background: "white",
  };

  const approve = async (id: string) => {
    if (!adminToken) { alert('Enter admin token'); return; }
    setBusyId(id);
    try {
      const res = await fetch('/api/cortex?action=approve_draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Approve failed');
      alert('Approved');
      fetchDrafts();
    } catch (e: any) {
      alert('Approve failed: ' + (e?.message || e));
    } finally { setBusyId(null); }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>
        Admin Dashboard 📊
      </h1>

      {/* STATS */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Stat label="Total" value={data.length} />
        <Stat label="Bugs" value={grouped.bug.length} />
        <Stat label="Features" value={grouped.feature.length} />
        <Stat label="General" value={grouped.general.length} />
      </div>

      {/* CONTENT */}
      <div style={{ marginTop: 24 }}>
        {loading ? (
          <p>Loading feedback...</p>
        ) : data.length === 0 ? (
          <p>No feedback yet.</p>
        ) : (
          data.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={{ fontWeight: 700 }}>
                {item.type.toUpperCase()}
              </div>

              <p style={{ marginTop: 6 }}>{item.message}</p>

              <small style={{ color: "gray" }}>
                {new Date(item.created_at).toLocaleString()}
              </small>
            </div>
          ))
        )}
      </div>

      <section style={{ marginTop: 40 }}>
        <h2>Generated Course Drafts</h2>
        <div style={{ marginBottom: 8 }}>
          <input placeholder="Admin token" value={adminToken} onChange={e => setAdminToken(e.target.value)} style={{ padding: 8, width: 360 }} />
        </div>
        {draftsLoading ? <p>Loading drafts...</p> : drafts.length === 0 ? <p>No drafts found.</p> : (
          drafts.map(d => (
            <div key={d.id} style={{ border: '1px solid #eee', padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{d.draft?.title ?? 'Untitled'}</div>
              <div style={{ color: 'gray', fontSize: 12 }}>{d.created_at} — user: {d.user_id ?? d.userId ?? 'unknown'}</div>
              <p>{d.draft?.description}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => approve(d.id)} disabled={busyId === d.id}>Approve</button>
              </div>
              {d.moderationIssues && d.moderationIssues.length > 0 && (
                <div style={{ marginTop: 8, color: 'orange' }}>
                  <strong>Moderation issues:</strong>
                  <ul>{d.moderationIssues.map((m: any, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        minWidth: 100,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "gray" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
