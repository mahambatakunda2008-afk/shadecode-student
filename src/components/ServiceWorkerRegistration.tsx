"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
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
    return () => { cancelled = true; };
  }, []);

  return null;
}
