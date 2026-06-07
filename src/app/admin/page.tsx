"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchFeedback();

    // SIMPLE POLLING (NO SUPABASE REALTIME SETUP NEEDED)
    const interval = setInterval(() => {
      fetchFeedback();
    }, 5000);

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
