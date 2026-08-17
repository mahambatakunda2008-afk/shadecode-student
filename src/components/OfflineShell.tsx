"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Non-blocking offline indicator.
 *
 * This used to be a full-screen, fixed, z-index:9999 opaque overlay that
 * covered the entire app the instant the browser reported offline -- its
 * own copy claimed "Cached content is still accessible" while the overlay
 * itself was what made that content inaccessible, since nothing behind it
 * could be seen or interacted with. For an app whose whole point is to
 * keep working offline (service worker caching, local-first data), a
 * full-page block on "offline" was the opposite of offline-first: it
 * treated "no network" as "app is broken" instead of "app is running on
 * local/cached data." Found 2026-08-15 while investigating why the app
 * "requires internet, fails" per a direct owner report.
 *
 * Replaced with a small, fixed, non-blocking banner. The rest of the app
 * -- whatever the service worker or local-first layer has cached -- stays
 * fully visible and usable underneath it.
 */
export default function OfflineShell() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

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
        padding: "9px 16px",
        borderRadius: 999,
        background: "rgba(15, 17, 23, 0.94)",
        border: "1px solid rgba(99,102,241,0.35)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        color: "#e2e8f0",
        fontSize: 13,
        fontWeight: 600,
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "none",
      }}
    >
      <WifiOff size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
      You&apos;re offline -- showing cached content
    </div>
  );
}
