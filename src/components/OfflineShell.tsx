"use client";

import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { BrandMark } from "@/components/brand/BrandMark";
import { createClient } from "@/lib/supabase/client";
import { mutationQueue } from "@/lib/offline/mutationQueue";
import { offlineSync } from "@/lib/offline/sync";

type SyncStatus = { pending: number; failed: number };

/** Non-blocking offline/sync indicator. Cached/local content remains usable. */
export default function OfflineShell() {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>({ pending: 0, failed: 0 });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const next = await mutationQueue.getStatus(user.id);
        if (!cancelled) setStatus(next);
      } catch {
        // Offline storage may be unavailable in restricted/private browsing contexts.
      }
    };

    void refresh();
    timer = setInterval(() => void refresh(), 5000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      await offlineSync.syncAll();
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setStatus(await mutationQueue.getStatus(user.id));
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && status.pending === 0 && status.failed === 0) return null;

  const message = !isOnline
    ? status.pending > 0
      ? `${status.pending} change${status.pending === 1 ? "" : "s"} saved on this device`
      : "You’re offline -- showing cached content"
    : status.failed > 0
      ? `${status.failed} change${status.failed === 1 ? "" : "s"} need${status.failed === 1 ? "s" : ""} attention`
      : `Syncing ${status.pending} saved change${status.pending === 1 ? "" : "s"}`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px 8px 14px",
        borderRadius: 999,
        background: "rgba(6, 17, 28, 0.96)",
        border: "1px solid rgba(34,211,238,0.24)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        color: "#e6f7fb",
        fontSize: 12,
        fontWeight: 600,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <BrandMark width={15} height={15} style={{ color: "#22D3EE", flexShrink: 0 }} aria-hidden="true" />
      {!isOnline ? <WifiOff size={13} color="#9fb2bc" style={{ flexShrink: 0 }} /> : null}
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{message}</span>
      {isOnline && status.pending > 0 && (
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          aria-label="Sync saved changes"
          title="Sync saved changes"
          style={{
            width: 26,
            height: 26,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            border: 0,
            borderRadius: 999,
            background: "rgba(34,211,238,0.12)",
            color: "#67e8f9",
            cursor: syncing ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : undefined }} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
