"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Bug, Lightbulb, MessageCircle } from "lucide-react";

interface FeedbackItem {
  id: string;
  user_id: string | null;
  type: string;
  message: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  bug: { icon: Bug, color: "var(--danger)", label: "Bug" },
  feature: { icon: Lightbulb, color: "var(--warning)", label: "Feature" },
  general: { icon: MessageCircle, color: "var(--primary)", label: "General" },
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setItems(data.feedback ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
          Feedback
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
          {items.length} submission{items.length === 1 ? "" : "s"}
        </p>

        {error && (
          <div style={{ padding: 14, borderRadius: 12, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 16 }}>
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ height: 160, borderRadius: 14, background: "var(--surface-2)" }} />
        ) : items.length === 0 ? (
          <div style={{ padding: 40, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "center" }}>
            <MessageSquare size={28} color="var(--muted-foreground)" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>No feedback yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => {
              const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.general;
              const Icon = config.icon;
              return (
                <div key={item.id} style={{ padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon size={13} color={config.color} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: config.color }}>{config.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, whiteSpace: "pre-wrap" }}>{item.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
