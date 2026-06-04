"use client";

// src/app/onboarding/page.tsx
//
// Replaces the bare single-button onboarding page.
// Uses: setOnboardingComplete() from @/lib/onboarding
// After completion: creates subjects in Supabase, redirects to /dashboard.
// Styled to match the app's dark design language from (app)/layout.tsx.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOnboardingComplete } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";

const LEVELS = [
  { id: "o-level",    label: "O-Level",    sub: "ZIMSEC / GCSE",        emoji: "📗" },
  { id: "a-level",    label: "A-Level",    sub: "AS & A2",              emoji: "📘" },
  { id: "university", label: "University", sub: "Degree level",          emoji: "🎓" },
  { id: "other",      label: "Other",      sub: "Self-study / Revision", emoji: "📚" },
];

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  "o-level":    ["Mathematics", "Physics", "Chemistry", "Biology", "Geography", "History", "English Language", "Accounts", "Business Studies", "Computer Science"],
  "a-level":    ["Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Geography", "Computer Science", "Psychology", "Sociology"],
  "university": ["Mathematics", "Physics", "Computer Science", "Economics", "Psychology", "Sociology", "Biology", "Chemistry"],
  "other":      ["Mathematics", "Physics", "Chemistry", "Biology", "English Language", "Computer Science", "History", "Geography"],
};

const DAILY_GOALS = [
  { id: 15,  label: "15 min", sub: "Light", emoji: "☕" },
  { id: 30,  label: "30 min", sub: "Consistent", emoji: "🔥", popular: true },
  { id: 60,  label: "1 hour", sub: "Focused", emoji: "⚡" },
  { id: 120, label: "2 hours", sub: "Intensive", emoji: "🚀" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [saving, setSaving] = useState(false);

  const availableSubjects = level ? (SUBJECTS_BY_LEVEL[level] ?? []) : [];

  function toggleSubject(name: string) {
    setSubjects((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : prev.length < 6
        ? [...prev, name]
        : prev
    );
  }

  async function finish() {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && subjects.length > 0) {
        // Insert selected subjects into Supabase
        // Upsert to avoid duplicate key errors if user re-runs onboarding
        await supabase.from("subjects").upsert(
          subjects.map((name) => ({
            user_id: user.id,
            name,
          })),
          { onConflict: "user_id,name", ignoreDuplicates: true }
        );

        // Update profile with level + daily goal
        await supabase
          .from("profiles")
          .update({
            level: 1,
            ...(level ? { education_level: level } : {}),
          })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("Onboarding save error:", err);
      // Non-fatal — proceed regardless
    } finally {
      setOnboardingComplete();
      router.replace("/dashboard");
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "14px 16px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s",
    color: "white",
  };

  const activeCard: React.CSSProperties = {
    ...card,
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.45)",
  };

  const primaryBtn: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: "var(--primary, #6366f1)",
    color: "white",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 16,
    opacity: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  const disabledBtn: React.CSSProperties = {
    ...primaryBtn,
    opacity: 0.35,
    cursor: "not-allowed",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a10",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 99,
                background: i <= step ? "#6366f1" : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* ── STEP 0: Level ─────────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
                Step 1 of 3
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
                What are you studying?
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                Cortex will personalise your experience for your level.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  style={level === l.id ? activeCard : card}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{l.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{l.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {l.sub}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              style={level ? primaryBtn : disabledBtn}
              disabled={!level}
            >
              Continue →
            </button>
          </>
        )}

        {/* ── STEP 1: Subjects ──────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
                Step 2 of 3
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
                Pick your subjects
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                Choose up to 6. Cortex will track your progress in each.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                maxHeight: 300,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {availableSubjects.map((name) => {
                const picked = subjects.includes(name);
                const maxed = subjects.length >= 6 && !picked;
                return (
                  <button
                    key={name}
                    onClick={() => toggleSubject(name)}
                    disabled={maxed}
                    style={{
                      ...(picked ? activeCard : card),
                      opacity: maxed ? 0.4 : 1,
                      fontSize: 13,
                      fontWeight: picked ? 600 : 400,
                      padding: "11px 14px",
                    }}
                  >
                    {picked && (
                      <span style={{ color: "#818cf8", marginRight: 5 }}>✓</span>
                    )}
                    {name}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 10 }}>
              {subjects.length}/6 selected
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(0)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  marginTop: 16,
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(2)}
                style={subjects.length > 0 ? { ...primaryBtn, flex: 2 } : { ...disabledBtn, flex: 2 }}
                disabled={subjects.length === 0}
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Daily goal ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
                Step 3 of 3
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
                Daily study goal
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                How much do you want to study each day?
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {DAILY_GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setDailyGoal(g.id)}
                  style={{
                    ...(dailyGoal === g.id ? activeCard : card),
                    position: "relative",
                  }}
                >
                  {g.popular && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        fontSize: 9,
                        fontWeight: 700,
                        background: "rgba(99,102,241,0.25)",
                        color: "#818cf8",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      Popular
                    </span>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{g.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {g.sub}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  marginTop: 16,
                }}
              >
                ← Back
              </button>
              <button
                onClick={finish}
                disabled={saving}
                style={{ ...primaryBtn, flex: 2, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        animation: "ob-spin 0.8s linear infinite",
                      }}
                    />
                    Setting up…
                  </>
                ) : (
                  "Start studying 🚀"
                )}
              </button>
            </div>
          </>
        )}

      </div>
      <style>{`@keyframes ob-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
