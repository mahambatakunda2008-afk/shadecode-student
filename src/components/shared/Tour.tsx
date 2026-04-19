"use client";

import { useState, useEffect } from "react";

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const tourSteps: TourStep[] = [
  {
    target: "nav-home",
    title: "Home",
    description: "This is your home page. Come back here anytime.",
  },
  {
    target: "nav-timetable",
    title: "Timetable",
    description: "View and regenerate your study schedule here.",
  },
  {
    target: "nav-tasks",
    title: "Tasks",
    description: "Add tasks per subject and earn XP by completing them.",
  },
  {
    target: "nav-dashboard",
    title: "Dashboard",
    description: "Track your level, XP, streak, and achievements here.",
  },
  {
    target: "streak-card",
    title: "🔥 Streak",
    description: "Your streak grows every day you open the app and study. Don't break it.",
  },
  {
    target: "xp-card",
    title: "⚡ XP & Level",
    description: "Complete tasks to earn XP and level up.",
  },
  {
    target: "cortex-card",
    title: "🧠 Cortex",
    description: "Cortex observes your study behavior and reflects patterns back to you.",
  },
];

interface TourProps {
  onComplete: () => void;
}

export default function Tour({ onComplete }: TourProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

 const current = tourSteps[step] || null;

  useEffect(() => {
    const el = document.getElementById(current.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
      }, 400);
    }
  }, [step]);

  const next = () => {
  if (step < tourSteps.length - 1) {
    setStep(step + 1);
  } else {
    setStep(tourSteps.length); // trigger outro
  }
};

  const skip = () => onComplete();

  const isAboveCenter = targetRect && targetRect.top > window.innerHeight / 2;

  return (
    <>
      {/* Dark overlay with hole cut out */}
      {targetRect && current && (
        <>
          {/* Top overlay */}
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: targetRect.top - 6,
            background: "rgba(0,0,0,0.75)",
            zIndex: 998,
            pointerEvents: "none",
          }} />
          {/* Bottom overlay */}
          <div style={{
            position: "fixed",
            top: targetRect.bottom + 6,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 998,
            pointerEvents: "none",
          }} />
          {/* Left overlay */}
          <div style={{
            position: "fixed",
            top: targetRect.top - 6,
            left: 0,
            width: targetRect.left - 6,
            height: targetRect.height + 12,
            background: "rgba(0,0,0,0.75)",
            zIndex: 998,
            pointerEvents: "none",
          }} />
          {/* Right overlay */}
          <div style={{
            position: "fixed",
            top: targetRect.top - 6,
            left: targetRect.right + 6,
            right: 0,
            height: targetRect.height + 12,
            background: "rgba(0,0,0,0.75)",
            zIndex: 998,
            pointerEvents: "none",
          }} />

          {/* Highlight border */}
          <div style={{
            position: "fixed",
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: "12px",
            border: "2px solid var(--primary)",
            zIndex: 999,
            pointerEvents: "none",
            boxShadow: "0 0 16px var(--primary-glow)",
            transition: "all 0.4s ease",
          }} />

          {/* Arrow pointing to element */}
          <div style={{
            position: "fixed",
            left: targetRect.left + targetRect.width / 2 - 12,
            top: isAboveCenter ? targetRect.top - 36 : targetRect.bottom + 8,
            zIndex: 1000,
            pointerEvents: "none",
            fontSize: "20px",
            animation: "bounce 0.8s infinite",
          }}>
            {isAboveCenter ? "⬇️" : "⬆️"}
          </div>
        </>
      )}

      {/* Tooltip */}
      {targetRect && current && (
        <div style={{
          position: "fixed",
          bottom: isAboveCenter ? window.innerHeight - targetRect.top + 52 : undefined,
          top: !isAboveCenter ? targetRect.bottom + 52 : undefined,
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 48px)",
          maxWidth: "400px",
          background: "var(--card)",
          border: "1px solid var(--primary)",
          borderRadius: "12px",
          padding: "16px",
          zIndex: 1000,
          boxShadow: "0 0 24px var(--primary-glow)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--primary)" }}>
              {current.title}
            </p>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              {step + 1}/{tourSteps.length}
            </p>
          </div>

          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "16px" }}>
            {current.description}
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={skip}
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Skip
            </button>
            <button
              onClick={next}
              style={{
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 700,
                flex: 1,
                boxShadow: "0 0 12px var(--primary-glow)",
              }}
            >
              {step === tourSteps.length - 1 ? "Done 🚀" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      {/* Outro */}
{step === tourSteps.length && (
  <>
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.9)",
      zIndex: 998,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--primary)",
        borderRadius: "16px",
        padding: "32px 24px",
        width: "calc(100% - 48px)",
        maxWidth: "400px",
        textAlign: "center",
        boxShadow: "0 0 40px var(--primary-glow)",
      }}>
        <p style={{ fontSize: "48px", marginBottom: "16px" }}>🚀</p>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
          You're all set.
        </h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
          Your study environment is ready. Stay consistent, earn XP, and let Cortex guide your patterns.
        </p>
        <button
          onClick={onComplete}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
            width: "100%",
            boxShadow: "0 0 16px var(--primary-glow)",
          }}
        >
          Start Studying
        </button>
      </div>
    </div>
  </>
)}
    </>
  );
}