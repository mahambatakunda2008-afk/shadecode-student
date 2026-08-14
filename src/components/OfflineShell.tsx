"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineShell() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] border-t border-border/70 bg-background/95 px-4 py-2.5 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span className="truncate">Offline. Your local study data is still available.</span>
        </div>
        <Link href="/offline" className="shrink-0 rounded-lg border px-3 py-1.5 font-semibold hover:bg-muted">
          Open offline mode
        </Link>
      </div>
    </div>
  );
}
