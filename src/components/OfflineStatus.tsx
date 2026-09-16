"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = navigator.onLine;
      setOnline(next);
      if (!next) setVisible(true);
      else window.setTimeout(() => setVisible(false), 1800);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[10000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] shadow-[var(--shadow-lg)]"
      style={{ paddingTop: "max(8px, env(safe-area-inset-top, 0px))" }}
    >
      {online ? <Wifi className="h-3.5 w-3.5 text-[var(--success)]" /> : <CloudOff className="h-3.5 w-3.5 text-[var(--warning)]" />}
      <span>{online ? "Back online" : "Offline mode · saved work stays on this device"}</span>
    </div>
  );
}
