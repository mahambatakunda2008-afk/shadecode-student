"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "4rem" }}>✅</span>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>You&apos;re back online</h1>
        <Link href="/dashboard" style={{
          background: "var(--primary)", color: "white", padding: "12px 24px",
          borderRadius: "8px", textDecoration: "none", fontWeight: 700,
        }}>
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      padding: "60px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      gap: "20px",
    }}>
      <div style={{
        width: "80px", height: "80px", borderRadius: "50%",
        background: "rgba(99,102,241,0.1)",
        border: "2px solid rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "2.5rem",
      }}>
        🧠
      </div>

      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
          Cortex is standing by
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "15px", lineHeight: 1.6, maxWidth: "300px" }}>
          No internet connection detected. Your cached data is still available.
        </p>
      </div>

      <div style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: "12px",
        padding: "14px 18px",
        fontSize: "13px",
        color: "var(--muted-foreground)",
        lineHeight: 1.6,
        maxWidth: "320px",
      }}>
        ⚡ Load shedding? No problem — Shadecode Student works offline. Your tasks, timetable, and exams are cached locally.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "320px" }}>
        <Link href="/dashboard" style={{
          background: "var(--primary)", color: "white", padding: "14px",
          borderRadius: "12px", textDecoration: "none", fontWeight: 700,
          fontSize: "15px", textAlign: "center",
          boxShadow: "0 0 16px var(--primary-glow)",
        }}>
          Go to Dashboard
        </Link>
        <Link href="/tasks" style={{
          background: "var(--card)", color: "var(--foreground)", padding: "14px",
          borderRadius: "12px", textDecoration: "none", fontWeight: 600,
          fontSize: "14px", textAlign: "center",
          border: "1px solid var(--card-border)",
        }}>
          View Tasks
        </Link>
        <Link href="/timetable" style={{
          background: "var(--card)", color: "var(--foreground)", padding: "14px",
          borderRadius: "12px", textDecoration: "none", fontWeight: 600,
          fontSize: "14px", textAlign: "center",
          border: "1px solid var(--card-border)",
        }}>
          View Timetable
        </Link>
      </div>
    </div>
  );
}
