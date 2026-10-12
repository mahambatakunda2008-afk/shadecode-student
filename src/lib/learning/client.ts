import type { LearningSignal } from "./signals";

/** Fire-and-forget: learning must never slow down or break a student's session. */
export function sendLearningSignals(signals: LearningSignal[]): void {
  if (!signals.length || typeof fetch === "undefined") return;
  try {
    void fetch("/api/learning/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signals: signals.slice(0, 50) }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignored on purpose
  }
}
