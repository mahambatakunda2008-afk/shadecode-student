"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    setLoading(true);

    const res = await fetch("/api/admin/feedback", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}`,
      },
    });

    const json = await res.json();

    setData(json.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const grouped = {
    bug: data.filter((d) => d.type === "bug"),
    feature: data.filter((d) => d.type === "feature"),
    general: data.filter((d) => d.type === "general"),
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Admin Dashboard</h1>

      {loading ? (
        <p>Loading feedback...</p>
      ) : (
        <>
          {/* STATS */}
          <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
            <Stat label="Total" value={data.length} />
            <Stat label="Bugs" value={grouped.bug.length} />
            <Stat label="Features" value={grouped.feature.length} />
            <Stat label="General" value={grouped.general.length} />
          </div>

          {/* LIST */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {item.type.toUpperCase()}
                </div>
                <p style={{ marginTop: 6 }}>{item.message}</p>
                <small style={{ color: "gray" }}>
                  {new Date(item.created_at).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: 12, color: "gray" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
