/**
 * src/lib/learning/server.ts
 *
 * Server-side, best-effort recording of learning signals (RLS: a user may only
 * insert rows for themselves). A failure is logged and never reaches the student.
 */

import type { LearningSignal } from "./signals";

interface InsertClient {
  from(table: string): { insert(values: unknown): PromiseLike<{ error: unknown }> };
}

export async function recordSignalsServer(client: unknown, userId: string, signals: LearningSignal[]): Promise<void> {
  if (!signals.length) return;
  try {
    const { error } = await (client as InsertClient).from("learning_signals").insert(signals.map((signal) => ({ ...signal, user_id: userId })));
    if (error) console.error("[learning signals]", error);
  } catch (error) {
    console.error("[learning signals]", error);
  }
}
