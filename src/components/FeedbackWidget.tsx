"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchWithTimeout } from "@/lib/async/fetchWithTimeout";
import { trackEvent } from "@/lib/traction/client";

type FeedbackType = "bug" | "feature" | "general";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false); const [type, setType] = useState<FeedbackType>("general"); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false); const [errorMessage, setErrorMessage] = useState("");
  const reset = () => { setType("general"); setMessage(""); setSubmitted(false); setErrorMessage(""); };
  const close = () => { setOpen(false); window.setTimeout(reset, 200); };
  useEffect(() => { const openFeedback = () => setOpen(true); window.addEventListener("shadecode:open-feedback", openFeedback); return () => window.removeEventListener("shadecode:open-feedback", openFeedback); }, []);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); });
  const handleSubmit = async () => {
    const trimmed = message.trim(); if (!trimmed || submitting || trimmed.length > 500) return; setSubmitting(true); setErrorMessage("");
    try {
      const response = await fetchWithTimeout("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: trimmed }),
      }, 10000);
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        throw new Error(typeof result?.error === "string" ? result.error : "Could not send feedback. Please try again.");
      }
      void trackEvent("feedback_submitted", { type, messageLength: trimmed.length, source: "widget" });
      setSubmitted(true);
    } catch (err) {
      console.error("[FeedbackWidget] Feedback error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Could not send feedback. Your message has not been confirmed as saved. Please try again.");
    } finally { setSubmitting(false); }
  };
  return <>
    {open && <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/20 p-3 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="ssc-card relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto p-4 sm:p-5" role="dialog" aria-modal="true" aria-label="Send feedback">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X size={16} /></button>
        {submitted ? <div className="flex flex-col items-center gap-2 py-3 text-center"><span className="text-2xl">📡</span><p className="font-semibold">We got it</p><p className="text-sm text-[var(--muted-foreground)]">Thanks. Your feedback helps improve Shadecode Student.</p><button type="button" onClick={close} className="ssc-button-secondary mt-1">Close</button></div> : <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pr-8"><div><h2 className="text-base font-semibold">Send feedback</h2><p className="text-[11px] text-[var(--muted-foreground)]">One quick message is enough.</p></div></div>
          {errorMessage && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-600">{errorMessage}</p>}
          <div className="grid grid-cols-3 gap-1.5">{(["bug", "feature", "general"] as const).map((t) => <button key={t} type="button" onClick={() => setType(t)} className="rounded-lg py-1.5 text-xs font-medium capitalize" style={{ border: type === t ? "2px solid var(--primary)" : "1px solid var(--card-border)", background: type === t ? "rgba(99,102,241,0.12)" : "var(--muted)" }}>{t}</button>)}</div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={type === "bug" ? "What went wrong?" : type === "feature" ? "What should we add?" : "Share anything..."} maxLength={500} rows={3} autoFocus className="w-full resize-none rounded-lg border p-2.5 text-sm outline-none" style={{ background: "var(--muted)", borderColor: "var(--card-border)" }} />
          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]"><span>Esc to close</span><span>{message.length}/500</span></div>
          <button type="button" onClick={handleSubmit} disabled={!message.trim() || submitting} className="ssc-button w-full" style={{ opacity: !message.trim() || submitting ? 0.5 : 1 }}>{submitting ? "Sending..." : "Send"}</button>
        </div>}
      </div>
    </div>}
  </>;
}
