"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

export default function ServiceWorkerRegistration() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;
        if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } catch {
        // Offline support is progressive enhancement. A registration failure
        // must never prevent the application itself from booting.
      }
    };

    void register();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;
      void navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: "CLEAR_APP_CACHE" });
      }).catch(() => undefined);
    });

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isStandalone()) return;
      setInstallPrompt(event as InstallPromptEvent);
      setShowInstall(true);
    };

    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
  };

  return showInstall && installPrompt ? (
    <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-md rounded-2xl border border-cyan-500/20 bg-[var(--card)] p-3 shadow-2xl shadow-black/20 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500"><Download size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Install Shadecode Student</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">Use it like a mobile app, with faster access and offline-ready study.</p>
        </div>
        <button onClick={() => setShowInstall(false)} aria-label="Dismiss install prompt" className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X size={16} /></button>
      </div>
      <button onClick={() => void install()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-slate-950">Install app <Download size={14} /></button>
    </div>
  ) : null;
}
