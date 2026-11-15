import "server-only";

export type PracticeEventResult = {
  recorded: false;
  reason: "untrusted_reference";
};

/**
 * Client-submitted reference answers are not authoritative marking evidence.
 * This compatibility guard deliberately refuses to persist practice events
 * until the question and mark scheme can be resolved server-side.
 */
export async function recordVerifiedPracticeAttempt(): Promise<PracticeEventResult> {
  return { recorded: false, reason: "untrusted_reference" };
}
