"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "pwa-install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem(DISMISSED_KEY) === "true") return;
    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as InstallPromptEvent;
      event.preventDefault();
      setDeferredPrompt(installEvent);
      setShowPrompt(true);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      sessionStorage.removeItem(DISMISSED_KEY);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div role="dialog" aria-label="Install Shadecode Student" style={{ position: "fixed", bottom: 20, left: 20, right: 20, maxWidth: 400, margin: "0 auto", background: "#0B1724", border: "1px solid rgba(34,211,238,0.22)", borderRadius: 16, padding: 20, boxShadow: "0 18px 60px rgba(0,0,0,0.45)", zIndex: 1000, animation: "slideUp 0.3s ease-out" }}>
      <button onClick={handleDismiss} aria-label="Dismiss install prompt" style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "#9fb2bc", cursor: "pointer", padding: 4, borderRadius: 4 }}><X size={16} /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(34,211,238,0.09)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22D3EE" }}>
          <BrandMark width={27} height={27} aria-hidden="true" />
        </div>
        <div><h3 style={{ fontSize: 16, fontWeight: 400, color: "#fff", margin: "0 0 4px", fontFamily: "var(--font-brand), sans-serif" }}>Install Shadecode Student</h3><p style={{ fontSize: 12, color: "#9fb2bc", margin: 0 }}>Get a dedicated app window and faster repeat access.</p></div>
      </div>
      <button onClick={handleInstall} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#22D3EE", border: "none", color: "#06111C", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-brand), sans-serif" }}>Install App</button>
      <a href="/download" style={{ display: "block", marginTop: 10, textAlign: "center", color: "#67E8F9", fontSize: 12, textDecoration: "none" }}>See every install option →</a>
      <style jsx>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
