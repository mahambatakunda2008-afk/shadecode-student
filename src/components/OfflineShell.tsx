"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { BrandMark } from "@/components/brand/BrandMark";

/** Non-blocking offline indicator. Cached/local content remains usable. */
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
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(6, 17, 28, 0.95)",
        border: "1px solid rgba(34,211,238,0.24)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        color: "#e6f7fb",
        fontSize: 12,
        fontWeight: 600,
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "none",
      }}
    >
      <BrandMark width={15} height={15} style={{ color: "#22D3EE", flexShrink: 0 }} aria-hidden="true" />
      <WifiOff size={13} color="#9fb2bc" style={{ flexShrink: 0 }} />
      You&apos;re offline -- showing cached content
    </div>
  );
}
