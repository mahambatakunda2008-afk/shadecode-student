"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/traction/client";

export default function Feedback() {
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage || submitting || cleanMessage.length > 500) return;
    setSubmitting(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("feedback").insert({ user_id: user?.id ?? null, type, message: cleanMessage, created_at: new Date().toISOString() });
      if (insertError) throw insertError;
      await fetch("/api/feedback-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, message: cleanMessage }) }).catch(() => undefined);
      void trackEvent("feedback_submitted", { type, messageLength: cleanMessage.length });
      setSubmitted(true);
    } catch (err) {
      console.error("[Feedback] submit failed:", err);
      setError("Could not send feedback. Please try again.");
    } finally { setSubmitting(false); }
  };

  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 };
  if (submitted) return <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}><span style={{ fontSize: "4rem" }}>📡</span><h1 style={{ fontSize: 26, fontWeight: 800 }}>We got it</h1><p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Your feedback has been recorded. Thanks for helping improve Shadecode Student.</p><button onClick={() => router.back()} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 8, padding: "12px 22px", fontWeight: 700, cursor: "pointer" }}>Back</button></div>;

  return <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div><button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 14, marginBottom: 10 }}>← Back</button><h1 style={{ fontSize: 28, fontWeight: 800 }}>Send Feedback</h1><p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Tell us what is actually helping, hurting, or missing.</p></div>
    <div style={cardStyle}><p style={{ fontWeight: 600, marginBottom: 10 }}>What are you reporting?</p><div style={{ display: "flex", gap: 8 }}>{(["bug", "feature", "general"] as const).map(t => <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: 10, borderRadius: 8, border: type === t ? "2px solid var(--primary)" : "1px solid transparent", background: type === t ? "rgba(99,102,241,.12)" : "var(--muted)", fontWeight: type === t ? 700 : 500, cursor: "pointer", fontSize: 13 }}>{t}</button>)}</div></div>
    <div style={cardStyle}><p style={{ fontWeight: 600, marginBottom: 8 }}>Your message</p><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={type === "bug" ? "Explain what went wrong..." : type === "feature" ? "What should we add?" : "Share anything..."} maxLength={500} rows={6} style={{ width: "100%", boxSizing: "border-box", background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 8, padding: 12, fontSize: 14, resize: "none", outline: "none" }} /><div style={{ fontSize: 11, marginTop: 6, color: "var(--muted-foreground)" }}>{message.length}/500</div></div>
    {error && <p role="alert" style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
    <button onClick={() => void handleSubmit()} disabled={!message.trim() || submitting} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 700, cursor: !message.trim() || submitting ? "not-allowed" : "pointer", opacity: !message.trim() || submitting ? .5 : 1 }}> {submitting ? "Sending..." : "Send Feedback →"}</button>
  </div>;
}
