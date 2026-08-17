"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/async/fetchWithTimeout";

type FeedbackType = "bug" | "feature" | "general";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false); const [type, setType] = useState<FeedbackType>("general"); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();
  const reset = () => { setType("general"); setMessage(""); setSubmitted(false); };
  const close = () => { setOpen(false); window.setTimeout(reset, 200); };
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); });
  const handleSubmit = async () => {
    const trimmed = message.trim(); if (!trimmed || submitting || trimmed.length > 500) return; setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("feedback").insert({ user_id: user?.id ?? null, type, message: trimmed, created_at: new Date().toISOString() });
      if (error) { console.error("[FeedbackWidget] Supabase error:", error); return; }
      fetchWithTimeout("/api/feedback-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, message: trimmed, userId: user?.id ?? null }) }, 10000).catch((err) => console.error("[FeedbackWidget] Notification failed:", err));
      setSubmitted(true);
    } catch (err) { console.error("[FeedbackWidget] Feedback error:", err); } finally { setSubmitting(false); }
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Send feedback" className="fixed bottom-24 right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6" style={{ background: "var(--primary)", color: "white", boxShadow: "0 4px 16px var(--primary-glow, rgba(99,102,241,0.4))" }}><MessageCircle size={22} /></button>
    {open && <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/20 p-3 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="ssc-card relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto p-4 sm:p-5" role="dialog" aria-modal="true" aria-label="Send feedback">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X size={16} /></button>
        {submitted ? <div className="flex flex-col items-center gap-2 py-3 text-center"><span className="text-2xl">📡</span><p className="font-semibold">We got it</p><p className="text-sm text-[var(--muted-foreground)]">Thanks. Your feedback helps improve Shadecode Student.</p><button type="button" onClick={close} className="ssc-button-secondary mt-1">Close</button></div> : <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pr-8"><div><h2 className="text-base font-semibold">Send feedback</h2><p className="text-[11px] text-[var(--muted-foreground)]">One quick message is enough.</p></div></div>
          <div className="grid grid-cols-3 gap-1.5">{(["bug", "feature", "general"] as const).map((t) => <button key={t} type="button" onClick={() => setType(t)} className="rounded-lg py-1.5 text-xs font-medium capitalize" style={{ border: type === t ? "2px solid var(--primary)" : "1px solid var(--card-border)", background: type === t ? "rgba(99,102,241,0.12)" : "var(--muted)" }}>{t}</button>)}</div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={type === "bug" ? "What went wrong?" : type === "feature" ? "What should we add?" : "Share anything..."} maxLength={500} rows={3} autoFocus className="w-full resize-none rounded-lg border p-2.5 text-sm outline-none" style={{ background: "var(--muted)", borderColor: "var(--card-border)" }} />
          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]"><span>Esc to close</span><span>{message.length}/500</span></div>
          <button type="button" onClick={handleSubmit} disabled={!message.trim() || submitting} className="ssc-button w-full" style={{ opacity: !message.trim() || submitting ? 0.5 : 1 }}>{submitting ? "Sending..." : "Send"}</button>
        </div>}
      </div>
    </div>}
  </>;
}
