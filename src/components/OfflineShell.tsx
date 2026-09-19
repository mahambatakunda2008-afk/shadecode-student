"use client";

import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { BrandMark } from "@/components/brand/BrandMark";
import { createClient } from "@/lib/supabase/client";
import { mutationQueue } from "@/lib/offline/mutationQueue";
import { offlineSync } from "@/lib/offline/sync";
import { summarizeFailedMutations, type FailedChangeSummary } from "@/lib/offline/failureSummary";

type SyncStatus = { pending: number; failed: number };

const DETAILS_ID = "offline-shell-details";

/** Non-blocking offline/sync indicator. Cached/local content remains usable. */
export default function OfflineShell() {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>({ pending: 0, failed: 0 });
  const [syncing, setSyncing] = useState(false);
  const [failedItems, setFailedItems] = useState<FailedChangeSummary[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const next = await mutationQueue.getStatus(user.id);
        const items = next.failed > 0 ? summarizeFailedMutations(await mutationQueue.listFailed(user.id)) : [];
        if (cancelled) return;
        setStatus(next);
        setFailedItems(items);
        if (next.failed === 0) setDetailsOpen(false);
      } catch {
        // Offline storage may be unavailable in restricted/private browsing contexts.
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (status.failed > 0) await mutationQueue.resetFailed(user.id);
      await offlineSync.syncAll();
      const next = await mutationQueue.getStatus(user.id);
      setStatus(next);
      setFailedItems(next.failed > 0 ? summarizeFailedMutations(await mutationQueue.listFailed(user.id)) : []);
      if (next.failed === 0) setDetailsOpen(false);
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

  const canExpand = isOnline && failedItems.length > 0;

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
      {canExpand ? (
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls={DETAILS_ID}
          title="Show what needs attention"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
            padding: 0,
            border: 0,
            background: "transparent",
            color: "inherit",
            font: "inherit",
            cursor: "pointer",
          }}
        >
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{message}</span>
          <ChevronDown
            size={13}
            aria-hidden="true"
            style={{ flexShrink: 0, transition: "transform 150ms ease", transform: detailsOpen ? "rotate(180deg)" : "none" }}
          />
        </button>
      ) : (
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{message}</span>
      )}
      {isOnline && (status.pending > 0 || status.failed > 0) && (
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
          <RefreshCw size={13} className={syncing ? "animate-spin" : undefined} aria-hidden="true" />
        </button>
      )}
      {canExpand && detailsOpen ? (
        <div
          id={DETAILS_ID}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "max-content",
            maxWidth: "calc(100vw - 32px)",
            padding: "10px 14px",
            borderRadius: 16,
            background: "rgba(6, 17, 28, 0.98)",
            border: "1px solid rgba(34,211,238,0.24)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            fontWeight: 500,
          }}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {failedItems.map((item) => (
              <li key={item.key} style={{ display: "grid", gap: 1 }}>
                <span style={{ fontWeight: 600 }}>
                  {item.label}
                  {item.count > 1 ? ` × ${item.count}` : ""}
                </span>
                <span style={{ color: "#9fb2bc" }}>{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
