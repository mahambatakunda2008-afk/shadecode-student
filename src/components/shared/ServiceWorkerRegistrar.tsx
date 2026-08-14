"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Shadecode service worker registered"))
        .catch(err => console.error("Service worker registration failed:", err));
    }
  }, []);

  return null;
}
