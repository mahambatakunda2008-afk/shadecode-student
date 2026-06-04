"use client";

// src/components/DailyChallenge.tsx
//
// Imported by: src/app/(app)/dashboard/page.tsx
// Shows today's challenge question. Fetches from Supabase or generates via AI.
// Falls back gracefully when no challenge exists yet.

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Flame, ChevronRight, CheckCircle2, Zap } from "lucide-react";

/**
 * @typedef {Object} DailyChallengeData
 * @property {string} id
 * @property {string} subject
 * @property {string} question
 */

interface UserChallengeStatus {
  completed: boolean;
  selected_option: number | null;
  xp_earned: number;
}

export default function DailyChallenge() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [challenge, setChallenge] = useState<DailyChallengeData | null>(null);
  const [status, setStatus] = useState<UserChallengeStatus>({
    completed: false,
    selected_option: null,
    xp_earned: 0,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    // Fetch today's challenge and user's attempt in parallel
    const [challengeRes, attemptRes] = await Promise.all([
      supabase
        .from("daily_challenges")
        .select("*")
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("daily_challenge_attempts")
        .select("completed, selected_option, xp_earned")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
    ]);

    if (challengeRes.data) {
      setChallenge(challengeRes.data as DailyChallengeData);
    }

    if (attemptRes.data?.completed) {
      setStatus(attemptRes.data as UserChallengeStatus);
      setSelected(attemptRes.data.selected_option);
      setRevealed(true);
    }

    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnswer = async (optionIndex: number) => {
    if (!challenge || !userId || revealed) return;

    setSelected(optionIndex);
    setRevealed(true);

    const isCorrect = optionIndex === challenge.correct_index;
    const xpEarned = isCorrect ? challenge.xp_reward : Math.floor(challenge.xp_reward / 3);

    setStatus({ completed: true, selected_option: optionIndex, xp_earned: xpEarned });

    // Persist attempt (fire and forget)
    supabase
      .from("daily_challenge_attempts")
      .upsert({
        user_id: userId,
        challenge_id: challenge.id,
        date: today,
        completed: true,
        selected_option: optionIndex,
        xp_earned: xpEarned,
      })
      .then(() => {
        if (xpEarned > 0) {
          supabase.rpc("increment_xp", { user_id: userId, amount: xpEarned }).catch(() => {});
        }
      });
  };

  const card: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: 16,
    padding: 16,
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.2)",
            borderTopColor: "var(--primary)",
            animation: "dc-spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Loading today&apos;s challenge…
        </span>
        <style>{`@keyframes dc-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── No challenge today — prompt to do Exam Sim instead ─────────────────────
  if (!challenge) {
    return (
      <div
        style={{
          ...card,
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03))",
          border: "1px solid rgba(99,102,241,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Flame size={16} color="#f59e0b" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Daily Challenge</p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                No challenge set for today
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/exam-sim")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--primary)",
              background: "rgba(99,102,241,0.1)",
              border: "none",
              borderRadius: 8,
              padding: "7px 12px",
              cursor: "pointer",
            }}
          >
            Practice instead <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  const isCorrect = revealed && selected === challenge.correct_index;
  const isWrong = revealed && selected !== challenge.correct_index;

  // ── Already completed ────────────────────────────────────────────────────────
  if (status.completed && revealed) {
    return (
      <div
        style={{
          ...card,
          background: isCorrect
            ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))"
            : "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))",
          border: `1px solid ${isCorrect ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={14} color="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>
              Daily Challenge · {challenge.subject}
            </span>
          </div>
          {status.xp_earned > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
              <Zap size={12} />+{status.xp_earned} XP
            </div>
          )}
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
          {challenge.question}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {challenge.options.map((opt, i) => {
            let bg = "var(--muted)";
            let borderColor = "var(--card-border)";
            let color = "var(--foreground)";

            if (i === challenge.correct_index) {
              bg = "rgba(34,197,94,0.12)";
              borderColor = "rgba(34,197,94,0.3)";
              color = "#22c55e";
            } else if (i === status.selected_option && !isCorrect) {
              bg = "rgba(239,68,68,0.08)";
              borderColor = "rgba(239,68,68,0.2)";
              color = "#f87171";
            }

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  fontSize: 13,
                  color,
                }}
              >
                {i === challenge.correct_index && <CheckCircle2 size={14} color="#22c55e" style={{ flexShrink: 0 }} />}
                <span>{opt}</span>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 10, textAlign: "center" }}>
          {isCorrect ? "✓ Correct! Come back tomorrow for a new challenge." : "Come back tomorrow for another chance to earn XP."}
        </p>
      </div>
    );
  }

  // ── Active challenge ─────────────────────────────────────────────────────────
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Flame size={14} color="#f59e0b" />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>
            Daily Challenge · {challenge.subject}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
          <Zap size={11} />
          +{challenge.xp_reward} XP
        </div>
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, lineHeight: 1.6 }}>
        {challenge.question}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {challenge.options.map((opt, i) => {
          let bg = "var(--muted)";
          let borderColor = "var(--card-border)";
          let color = "var(--foreground)";
          let cursor = "pointer";

          if (revealed) {
            cursor = "default";
            if (i === challenge.correct_index) {
              bg = "rgba(34,197,94,0.12)";
              borderColor = "rgba(34,197,94,0.3)";
              color = "#22c55e";
            } else if (i === selected) {
              bg = "rgba(239,68,68,0.08)";
              borderColor = "rgba(239,68,68,0.2)";
              color = "#f87171";
            }
          } else if (i === selected) {
            bg = "rgba(99,102,241,0.15)";
            borderColor = "rgba(99,102,241,0.4)";
            color = "#a78bfa";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={revealed}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: `1px solid ${borderColor}`,
                background: bg,
                color,
                fontSize: 13,
                fontWeight: 500,
                textAlign: "left",
                cursor,
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  color,
                }}
              >
                {["A", "B", "C", "D"][i]}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
