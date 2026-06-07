"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Feedback() {
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    if (message.length > 500) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Save feedback
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        type,
        message: message.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Supabase error:", error);
        alert("Could not send feedback. Try again.");
        setSubmitting(false);
        return;
      }

      // 2. Optional: trigger backend notification (email, etc.)
      await fetch("/api/feedback-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          userId: user?.id ?? null,
        }),
      }).catch((err) => {
        console.error("Notification failed:", err);
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Something went wrong.");
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

  if (submitted) {
    return (
      <div
        style={{
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "4rem" }}>📡</span>

        <h1 style={{ fontSize: "26px", fontWeight: 800 }}>
          We got it
        </h1>

        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Your feedback has been recorded and sent to the development team.
          <br />
          This helps us improve Shadecode Student.
        </p>

        <div
          style={{
            marginTop: 8,
            fontSize: "12px",
            color: "var(--muted-foreground)",
            opacity: 0.8,
          }}
        >
          You’re part of building this system.
        </div>

        <button
          onClick={() => router.back()}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 22px",
            fontWeight: 700,
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* HEADER */}
      <div>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "10px",
          }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
          Send Feedback
        </h1>

        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Help improve Shadecode Student — every message is reviewed.
        </p>
      </div>

      {/* TYPE SELECTOR */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: 10 }}>
          What are you reporting?
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          {(["bug", "feature", "general"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border:
                  type === t
                    ? "2px solid var(--primary)"
                    : "1px solid transparent",
                background:
                  type === t
                    ? "rgba(99,102,241,0.12)"
                    : "var(--muted)",
                fontWeight: type === t ? 700 : 500,
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGE */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>
          Your message
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === "bug"
              ? "Explain what went wrong..."
              : type === "feature"
              ? "What should we add?"
              : "Share anything..."
          }
          maxLength={500}
          rows={6}
          style={{
            width: "100%",
            background: "var(--muted)",
            border: "1px solid var(--card-border)",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            resize: "none",
            outline: "none",
          }}
        />

        <div
          style={{
            fontSize: 11,
            marginTop: 6,
            color: "var(--muted-foreground)",
          }}
        >
          {message.length}/500
        </div>
      </div>

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || submitting}
        style={{
          background: "var(--primary)",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: 14,
          fontWeight: 700,
          cursor:
            !message.trim() || submitting
              ? "not-allowed"
              : "pointer",
          opacity: !message.trim() || submitting ? 0.5 : 1,
          boxShadow: "0 0 18px var(--primary-glow)",
        }}
      >
        {submitting ? "Sending..." : "Send Feedback →"}
      </button>
    </div>
  );
}
