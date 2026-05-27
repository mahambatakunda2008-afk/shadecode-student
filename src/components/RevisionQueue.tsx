"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRevisionQueue, markRevised, RevisionItem } from "@/lib/revisionQueue";

// Max priority value used to scale the bar — caps at 5 for display purposes
const MAX_PRIORITY_DISPLAY = 5;

function PriorityBar({ priority }: { priority: number }) {
  const capped = Math.min(priority, MAX_PRIORITY_DISPLAY);
  const pct = (capped / MAX_PRIORITY_DISPLAY) * 100;
  const color =
    priority >= 4 ? "#ef4444" :
    priority >= 2 ? "#f59e0b" :
    "#6366f1";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{
        flex: 1, height: "4px", borderRadius: "99px",
        background: "var(--muted)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: "99px",
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 4px ${color}80`,
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        fontSize: "10px", fontWeight: 700, color,
        minWidth: "12px", textAlign: "right",
      }}>
        {priority}
      </span>
    </div>
  );
}

export default function RevisionQueue({ userId }: { userId: string }) {
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    getRevisionQueue(userId, 5).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [userId]);

  const handleRevise = async (item: RevisionItem) => {
    // Mark as revised optimistically in UI
    setItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, priority: 1 } : i)
    );

    // Persist the reset in background — non-blocking
    markRevised(item.id);

    // Navigate to /learn with topic pre-filled
    router.push(
      `/learn?topic=${encodeURIComponent(item.topic)}&subject=${encodeURIComponent(item.subject)}`
    );
  };

  // Don't render the section at all while loading or if queue is empty
  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--card-border)",
      borderRadius: "12px",
      padding: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <p style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--muted-foreground)", margin: 0,
        }}>
          Revision Queue
        </p>
        <span style={{
          fontSize: "10px", fontWeight: 700, padding: "2px 8px",
          borderRadius: "20px", background: "rgba(99,102,241,0.12)",
          color: "var(--primary)",
        }}>
          {items.length} pending
        </span>
      </div>

      {/* Queue items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 12px", borderRadius: "10px",
            background: "var(--muted)",
          }}>
            {/* Subject tag */}
            <div style={{ flexShrink: 0 }}>
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "2px 7px",
                borderRadius: "20px", background: "rgba(99,102,241,0.12)",
                color: "var(--primary)",
              }}>
                {item.subject}
              </span>
            </div>

            {/* Topic + priority bar */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{
                fontSize: "13px", fontWeight: 600, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: "var(--foreground)",
              }}>
                {item.topic}
              </p>
              <PriorityBar priority={item.priority} />
            </div>

            {/* Revise button */}
            <button
              onClick={() => handleRevise(item)}
              style={{
                flexShrink: 0,
                background: "var(--primary)", color: "white",
                border: "none", borderRadius: "8px",
                padding: "6px 12px", fontSize: "12px", fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Revise →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
