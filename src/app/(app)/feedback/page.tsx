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
    if (!message.trim()) return;
    if (message.length > 500) return;

    setSubmitting(true);

    try {
      // 1. Get user (if logged in)
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
        console.error("Supabase error:", error);
        alert("Failed to send feedback. Try again.");
        setSubmitting(false);
        return;
      }

      // 3. Send to WhatsApp backend
      const whatsappRes = await fetch("/api/feedback-whatsapp", {
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

      if (!whatsappRes.ok) {
        console.error("WhatsApp API failed");
        // we do NOT block success UI, but we log it
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Feedback submit error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: "3rem" }}>📲</div>
        <h1 style={{ fontWeight: 800 }}>Feedback sent</h1>
        <p style={{ color: "gray", marginTop: 8 }}>
          It has been saved and delivered.
        </p>

        <button
          onClick={() => router.back()}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            borderRadius: 8,
            background: "black",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Send Feedback</h1>

      {/* TYPE SELECTOR */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["bug", "feature", "general"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: type === t ? "2px solid black" : "1px solid gray",
              background: type === t ? "#eee" : "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* MESSAGE */}
      <textarea
        value={message}
        maxLength={500}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={
          type === "bug"
            ? "Describe the bug..."
            : type === "feature"
            ? "Describe the feature..."
            : "Share your thoughts..."
        }
        rows={6}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "1px solid gray",
          resize: "none",
        }}
      />

      <div style={{ fontSize: 12, color: "gray" }}>
        {message.length}/500
      </div>

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || submitting}
        style={{
          padding: 14,
          borderRadius: 10,
          background: submitting ? "#666" : "black",
          color: "white",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {submitting ? "Sending..." : "Send Feedback"}
      </button>
    </div>
  );
}
