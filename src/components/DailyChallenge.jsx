"use client";

import { useState, useEffect } from 'react';

  export default function DailyChallenge({ userId }) {
  const [challenge, setChallenge] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const response = await fetch('/api/challenges/today');
        const data = await response.json();
        setChallenge(data.challenge);

        const today = new Date().toDateString();
        const stored = localStorage.getItem(`dailyChallenge_${data.challenge?.id}_${today}`);
        setIsCompleted(!!stored);
      } catch (err) {
        console.error('Failed to fetch daily challenge:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, []);

  const handleComplete = async () => {
    if (!challenge || isCompleted || !userId || completing) return;
    setCompleting(true);

    try {
      const response = await fetch('/api/challenges/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, challengeId: challenge.id, xpReward: challenge.xp_reward }),
      });

      const data = await response.json();
      if (data.success) {
        setIsCompleted(true);
        setXpAwarded(challenge.xp_reward);
        const today = new Date().toDateString();
        localStorage.setItem(`dailyChallenge_${challenge.id}_${today}`, 'true');
      }
    } catch (err) {
      console.error('Failed to complete challenge:', err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--card-border)",
      borderRadius: "12px",
      padding: "16px",
      opacity: 0.6,
    }}>
      <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Loading challenge...</p>
    </div>
  );

  if (!challenge) return null;

  return (
    <div style={{
      background: isCompleted ? "rgba(34,197,94,0.06)" : "rgba(99,102,241,0.06)",
      border: `1px solid ${isCompleted ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)"}`,
      borderRadius: "14px",
      padding: "16px",
      transition: "all 0.3s ease",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px" }}>⚡</span>
          <p style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isCompleted ? "#22c55e" : "var(--primary)",
          }}>
            Daily Challenge
          </p>
        </div>
        {isCompleted && (
          <span style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "20px",
            background: "rgba(34,197,94,0.15)",
            color: "#22c55e",
          }}>
            +{xpAwarded || challenge.xp_reward} XP earned
          </span>
        )}
      </div>

      {/* Content */}
      <p style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px", color: "var(--foreground)" }}>
        {challenge.title}
      </p>
      <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "14px" }}>
        {challenge.description}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "13px" }}>🔮</span>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{challenge.xp_reward} XP</span> reward
          </p>
        </div>

        {isCompleted ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "8px",
            padding: "6px 12px",
          }}>
            <span style={{ fontSize: "13px" }}>✅</span>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#22c55e" }}>Completed</p>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={completing}
            style={{
              background: completing ? "var(--muted)" : "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: completing ? "not-allowed" : "pointer",
              boxShadow: completing ? "none" : "0 0 12px rgba(99,102,241,0.4)",
              transition: "all 0.2s ease",
              opacity: completing ? 0.6 : 1,
            }}
          >
            {completing ? "Completing..." : "Complete →"}
          </button>
        )}
      </div>
    </div>
  );
}
