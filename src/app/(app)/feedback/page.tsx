"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Feedback() {
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    if (message.length > 500) return;

    setSubmitting(true);

    try {
      // 1. Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 2. Save to Supabase (REAL CHECK)
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        type,
        message: message.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Supabase insert error:", error);
        alert("Failed to send feedback. Please try again.");
        setSubmitting(false);
        return;
      }

      // 3. Send email notification (no UI change, just backend alert)
      const res = await fetch("/api/feedback-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          message: message.trim(),
          userId: user?.id ?? null,
        }),
      });

      if (!res.ok) {
        console.error("Email API failed");
        // DO NOT block success — data is already stored
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  if (submitted)
    return (
      <div
        style={{
          padding: "32px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "4rem" }}>🙏</span>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Thank you</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Your feedback has been received and delivered.
        </p>

        <button
          onClick={() => router.back()}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div
      style={{
        padding: "32px 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: "14px",
            padding: 0,
            marginBottom: "12px",
          }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
          Send Feedback
        </h1>

        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Help us improve Shadecode Student
        </p>
      </div>

      {/* Type selector */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: "12px", fontSize: "14px" }}>
          What kind of feedback?
        </p>

        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { value: "bug", label: "🐛 Bug" },
            { value: "feature", label: "✨ Feature" },
            { value: "general", label: "💬 General" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setType(option.value as any)}
              style={{
                flex: 1,
                background:
                  type === option.value
                    ? "rgba(99,102,241,0.15)"
                    : "var(--muted)",
                border:
                  type === option.value
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid transparent",
                borderRadius: "8px",
                padding: "10px 6px",
                cursor: "pointer",
                color:
                  type === option.value
                    ? "var(--primary)"
                    : "var(--muted-foreground)",
                fontSize: "12px",
                fontWeight: type === option.value ? 700 : 400,
                textAlign: "center",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
          Your message
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === "bug"
              ? "Describe what happened and how to reproduce it..."
              : type === "feature"
              ? "Describe the feature you'd like to see..."
              : "Share your thoughts..."
          }
          maxLength={500}
          rows={6}
          style={{
            width: "100%",
            background: "var(--muted)",
            border: "1px solid var(--card-border)",
            borderRadius: "8px",
            padding: "12px 14px",
            color: "var(--foreground)",
            fontSize: "14px",
            outline: "none",
            resize: "none",
            lineHeight: 1.6,
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        <p
          style={{
            fontSize: "11px",
            color: "var(--muted-foreground)",
            marginTop: "6px",
          }}
        >
          {message.length}/500
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || submitting}
        style={{
          background: "var(--primary)",
          color: "white",
          border: "none",
          borderRadius: "12px",
          padding: "14px",
          fontWeight: 700,
          fontSize: "15px",
          cursor:
            !message.trim() || submitting ? "not-allowed" : "pointer",
          opacity: !message.trim() || submitting ? 0.5 : 1,
          boxShadow: "0 0 16px var(--primary-glow)",
          width: "100%",
        }}
      >
        {submitting ? "Sending..." : "Send Feedback →"}
      </button>
    </div>
  );
}
