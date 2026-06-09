"use client";

import { useEffect, useState } from "react";

export default function DailyChallenge({ onComplete }) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, []);

  async function fetchChallenge() {
    try {
      const res = await fetch("/api/challenges/today");
      const data = await res.json();

      if (data.error) {
        console.error("Challenge fetch error:", data.error);
        return;
      }

      setChallenge(data.challenge);
      setCompleted(data.completed || false);
    } catch (err) {
      console.error("Failed to load challenge:", err);
    } finally {
      setLoading(false);
    }
  }

  async function completeChallenge() {
    if (!challenge?.id || completed) return;

    setCompleting(true);

    try {
      const res = await fetch("/api/challenges/today/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: challenge.id,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to complete challenge");
      }

      const data = await res.json();
      setCompleted(true);
      setXpAwarded(data.xp_awarded || challenge.xp_reward || 0);
      setJustCompleted(true);

      // Notify parent (dashboard) so it can refresh XP etc.
      if (onComplete) {
        onComplete({ xp: data.xp_awarded || 0 });
      }

      // Clear the celebration animation after a few seconds
      setTimeout(() => setJustCompleted(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          <span className="text-sm text-[var(--muted-foreground)]">Loading today&apos;s challenge…</span>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  const difficultyColor =
    challenge.difficulty === "medium"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";

  return (
    <div
      id="daily-challenge-card"
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-500 ${
        justCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-indigo-500/15 bg-gradient-to-br from-indigo-500/8 to-purple-500/5"
      }`}
    >
      {/* Subtle animated glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{completed ? "✅" : "🔥"}</span>
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            Daily Challenge
          </p>
        </div>

        {challenge.difficulty && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${difficultyColor}`}
          >
            {challenge.difficulty}
          </span>
        )}
      </div>

      {/* Title + Description */}
      <div className="relative mb-3">
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          {challenge.title}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          {challenge.description}
        </p>
      </div>

      {/* Cortex explanation */}
      {challenge.explanation && (
        <div className="relative flex items-start gap-2 mb-3 rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
          <span className="text-xs mt-px flex-shrink-0">🧠</span>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {challenge.explanation}
          </p>
        </div>
      )}

      {/* Footer: XP + Complete button */}
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15">
          +{challenge.xp_reward} XP
        </span>

        <button
          id="daily-challenge-complete-btn"
          onClick={completeChallenge}
          disabled={completed || completing}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            completed
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-default"
              : completing
                ? "bg-indigo-500/40 text-white/70 cursor-wait"
                : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.25)] hover:shadow-[0_0_16px_rgba(99,102,241,0.4)] active:scale-[0.97]"
          }`}
        >
          {completed
            ? justCompleted
              ? `+${xpAwarded} XP ✓`
              : "Completed ✓"
            : completing
              ? "Completing…"
              : "Complete"}
        </button>
      </div>
    </div>
  );
}