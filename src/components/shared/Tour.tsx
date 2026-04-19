"use client";

import { useState, useEffect } from "react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    target: "nav-home",
    title: "Home",
    description: "This is your home page. Come back here anytime.",
    position: "top",
  },
  {
    target: "nav-timetable",
    title: "Timetable",
    description: "View and regenerate your study schedule here.",
    position: "top",
  },
  {
    target: "nav-tasks",
    title: "Tasks",
    description: "Add tasks per subject and earn XP by completing them.",
    position: "top",
  },
  {
    target: "nav-dashboard",
    title: "Dashboard",
    description: "Track your level, XP, streak, and achievements here.",
    position: "top",
  },
  {
    target: "streak-card",
    title: "🔥 Streak",
    description: "Your streak grows every day you open the app and study. Don't break it.",
    position: "bottom",
  },
  {
    target: "xp-card",
    title: "⚡ XP & Level",
    description: "Complete tasks to earn XP and level up.",
    position: "bottom",
  },
  {
    target: "cortex-card",
    title: "🧠 Cortex",
    description: "Cortex observes your study behavior and reflects patterns back to you.",
    position: "top",
  },
];

interface TourProps {
  onComplete: () => void;
}

export default function Tour({ onComplete }: TourProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const current = tourSteps[step];

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
      onComplete();
    }
  };

  const skip = () => onComplete();

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 998,
        pointerEvents: "none",
      }} />

      {/* Spotlight */}
      {targetRect && (
        <div style={{
          position: "fixed",
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          borderRadius: "12px",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
          border: "2px solid var(--primary)",
          zIndex: 999,
          pointerEvents: "none",
          transition: "all 0.4s ease",
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: "fixed",
        bottom: targetRect && targetRect.top > window.innerHeight / 2 ? window.innerHeight - targetRect.top + 16 : undefined,
        top: targetRect && targetRect.top <= window.innerHeight / 2 ? targetRect.bottom + 16 : undefined,
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
        {/* Arrow indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}>
          <span style={{ fontSize: "18px" }}>👆</span>
          <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--primary)" }}>
            {current.title}
          </p>
          <p style={{ marginLeft: "auto", fontSize: "12px", color: "var(--muted-foreground)" }}>
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
    </>
  );
}