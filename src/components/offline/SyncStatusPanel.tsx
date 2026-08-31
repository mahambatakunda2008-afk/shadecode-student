"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mutationQueue } from "@/lib/offline/mutationQueue";
import { offlineSync } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function SyncStatusPanel() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) return;
      const status = await mutationQueue.getStatus(user.id);
      setPending(status.pending);
      setFailed(status.failed);
    } catch { /* IndexedDB can be unavailable in restricted browsers. */ }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh, online]);

  const sync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) return;
      if (failed) await mutationQueue.resetFailed(user.id);
      await offlineSync.syncAll();
      await refresh();
    } finally { setSyncing(false); }
  };

  const label = !online ? "Offline · changes stay on this device" : failed ? `${failed} change${failed === 1 ? "" : "s"} need attention` : pending ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync` : "All changes synced";
  const Icon = !online ? WifiOff : failed ? AlertTriangle : pending || syncing ? RefreshCw : Check;

  return (
    <div aria-live="polite" data-testid="offline-sync-status" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
      <Icon size={14} className={syncing ? "animate-spin" : undefined} aria-hidden="true" />
      <span>{label}</span>
      {online && (pending > 0 || failed > 0) && <button type="button" onClick={() => void sync()} disabled={syncing} style={{ border: "1px solid var(--card-border)", borderRadius: 7, padding: "4px 8px", background: "var(--surface-2)", fontSize: 11, fontWeight: 700 }}>{syncing ? "Syncing…" : "Sync"}</button>}
    </div>
  );
}
