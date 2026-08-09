"use client";

/**
 * src/components/FeedbackWidget.tsx
 *
 * A floating, always-visible feedback entry point. The full feedback
 * flow already existed and worked (src/app/(app)/feedback/page.tsx,
 * /api/feedback insert, /api/feedback-email notification) -- the
 * problem reported wasn't a missing feature, it was discoverability:
 * buried one level inside Settings, so people didn't use it. This
 * reuses the exact same submission path (same table insert, same
 * notification call) as a one-click floating widget instead, mounted
 * globally in (app)/layout.tsx. The full Settings page is left
 * untouched as an additional, more spacious way to leave feedback --
 * this is purely additive, not a replacement.
 */

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/async/fetchWithTimeout";

type FeedbackType = "bug" | "feature" | "general";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const supabase = createClient();

  const reset = () => {
    setType("general");
    setMessage("");
    setSubmitted(false);
  };

  const close = () => {
    setOpen(false);
    // Delay reset until after the close animation/next open, so the
    // panel doesn't visibly flash back to the empty form while closing.
    setTimeout(reset, 200);
  };

  const handleSubmit = async () => {
    if (!message.trim() || submitting || message.length > 500) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        type,
        message: message.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[FeedbackWidget] Supabase error:", error);
        setSubmitting(false);
        return;
      }

      // Fire-and-forget, same as the full feedback page -- a failed
      // notification shouldn't block the user from seeing their
      // feedback was recorded, since the insert above already succeeded.
      fetchWithTimeout(
        "/api/feedback-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, message: message.trim(), userId: user?.id ?? null }),
        },
        10000
      ).catch((err) => console.error("[FeedbackWidget] Notification failed:", err));

      setSubmitted(true);
    } catch (err) {
      console.error("[FeedbackWidget] Feedback error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-24 right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        style={{
          background: "var(--primary)",
          color: "white",
          boxShadow: "0 4px 16px var(--primary-glow, rgba(99,102,241,0.4))",
        }}
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-end p-4 sm:items-end"
          onClick={close}
        >
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />

          <div
            className="ssc-card relative w-full max-w-sm p-5"
            style={{ marginBottom: "5rem" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <X size={16} />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="text-3xl">📡</span>
                <p className="font-semibold">We got it</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Thanks -- your feedback helps improve Shadecode Student.
                </p>
                <button type="button" onClick={close} className="ssc-button-secondary mt-2">
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <h2 className="pr-6 text-base font-semibold">Send feedback</h2>

                <div className="flex gap-2">
                  {(["bug", "feature", "general"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className="flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors"
                      style={{
                        border: type === t ? "2px solid var(--primary)" : "1px solid var(--card-border)",
                        background: type === t ? "rgba(99,102,241,0.12)" : "var(--muted)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "What went wrong?"
                      : type === "feature"
                      ? "What should we add?"
                      : "Share anything..."
                  }
                  maxLength={500}
                  rows={4}
                  autoFocus
                  className="w-full resize-none rounded-lg border p-2.5 text-sm outline-none"
                  style={{ background: "var(--muted)", borderColor: "var(--card-border)" }}
                />
                <div className="text-right text-xs text-[var(--muted-foreground)]">
                  {message.length}/500
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  className="ssc-button"
                  style={{ opacity: !message.trim() || submitting ? 0.5 : 1 }}
                >
                  {submitting ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
