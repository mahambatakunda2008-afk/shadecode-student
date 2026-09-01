"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import DashboardReimagined from "@/components/dashboard/DashboardReimagined";

/** Connectivity is status, never a prerequisite for mounting the dashboard. */
export default function DashboardWatchdog() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="relative min-h-full">
      <DashboardReimagined />
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border/60 bg-card/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur">
        {online ? <span className="inline-flex items-center gap-2"><Wifi className="h-3.5 w-3.5" aria-hidden="true" /> Online · syncing when needed</span> : <span className="inline-flex items-center gap-2"><WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> Offline · using saved data</span>}
      </div>
    </div>
  );
}
