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
    <div
      role="dialog"
      aria-label="Install Shadecode Student"
      className="ssc-above-nav fixed inset-x-3 z-[9990] mx-auto max-w-[400px] animate-[ssc-page-in_260ms_var(--ease-premium)_both] rounded-2xl border border-[var(--card-border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-lg)]"
    >
      <button type="button" onClick={handleDismiss} aria-label="Dismiss install prompt" className="ssc-icon-button absolute right-2 top-2 !h-9 !w-9 border-transparent bg-transparent text-[var(--muted-foreground)] shadow-none">
        <X size={16} aria-hidden="true" />
      </button>
      <div className="mb-3 flex items-center gap-3 pr-8">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--card-border)] bg-[var(--surface-2)]">
          <span aria-hidden="true" className="absolute inset-0 opacity-[0.12]" style={{ background: "var(--brand-gradient)" }} />
          <BrandMark className="relative h-8 w-8" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="ssc-brand-heading mb-1 text-base font-normal text-[var(--foreground)]">Install Shadecode Student</h3>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">Put your learning workspace on your phone. Reopen it like an app and keep saved study work available when your connection drops.</p>
        </div>
      </div>
      <button type="button" onClick={handleInstall} className="ssc-button w-full">Install App</button>
      <a href="/download" className="mt-2.5 block text-center text-xs font-medium text-[var(--primary)] hover:underline">See every install option →</a>
    </div>
  );
}
