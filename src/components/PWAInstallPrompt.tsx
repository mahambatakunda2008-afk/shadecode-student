"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "pwa-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
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
    <div role="dialog" aria-label="Install Shadecode Student" style={{ position: "fixed", bottom: 20, left: 20, right: 20, maxWidth: 400, margin: "0 auto", background: "linear-gradient(135deg, #1e1e3f, #2d2d5a)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 1000, animation: "slideUp 0.3s ease-out" }}>
      <button onClick={handleDismiss} aria-label="Dismiss install prompt" style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: 4, borderRadius: 4 }}><X size={16} /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Download size={24} color="#6366f1" /></div>
        <div><h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Install Shadecode Student</h3><p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Get a dedicated app window and faster repeat access.</p></div>
      </div>
      <button onClick={handleInstall} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Install App</button>
      <a href="/download" style={{ display: "block", marginTop: 10, textAlign: "center", color: "#a5b4fc", fontSize: 12, textDecoration: "none" }}>See every install option →</a>
      <style jsx>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
