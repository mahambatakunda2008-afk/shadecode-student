"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
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

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      setShowPrompt(false);
    }
  }, []);

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      left: 20,
      right: 20,
      maxWidth: 400,
      margin: "0 auto",
      background: "linear-gradient(135deg, #1e1e3f, #2d2d5a)",
      border: "1px solid rgba(99,102,241,0.3)",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      zIndex: 1000,
      animation: "slideUp 0.3s ease-out",
    }}>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "transparent",
          border: "none",
          color: "var(--muted-foreground)",
          cursor: "pointer",
          padding: 4,
          borderRadius: 4,
        }}
      >
        <X size={16} />
      </button>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "rgba(99,102,241,0.2)",
          border: "1px solid rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Download size={24} color="#6366f1" />
        </div>
        <div>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 4px",
          }}>
            Install Shadecode Student
          </h3>
          <p style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            margin: 0,
          }}>
            Get offline access and a better experience
          </p>
        </div>
      </div>

      <button
        onClick={handleInstall}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "filter 0.2s",
        }}
        onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
        onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
      >
        Install App
      </button>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
