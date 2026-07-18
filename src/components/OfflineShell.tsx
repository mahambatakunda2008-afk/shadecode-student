"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineShell() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "var(--surface)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      zIndex: 9999,
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        background: "rgba(99,102,241,0.1)",
        border: "1px solid rgba(99,102,241,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}>
        <WifiOff size={32} color="#6366f1" />
      </div>

      <h1 style={{
        fontSize: 24,
        fontWeight: 700,
        color: "#fff",
        margin: "0 0 12px",
        textAlign: "center",
      }}>
        You&apos;re Offline
      </h1>

      <p style={{
        fontSize: 14,
        color: "var(--muted-foreground)",
        margin: "0 0 24px",
        textAlign: "center",
        maxWidth: 300,
      }}>
        No internet connection. Some features may not be available. Cached content is still accessible.
      </p>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "12px 24px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "filter 0.2s",
        }}
        onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
        onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
      >
        <RefreshCw size={16} />
        Try Again
      </button>

      <p style={{
        fontSize: 12,
        color: "var(--muted-foreground)",
        margin: "24px 0 0",
        textAlign: "center",
      }}>
        Your progress will sync when you&apos;re back online
      </p>
    </div>
  );
}
