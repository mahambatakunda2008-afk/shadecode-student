export type PaperActionReplay = {
  verdict: "correct" | "partially_correct" | "incorrect";
  feedback: string | null;
  misconception: string | null;
  nextAction: string | null;
  attemptNo?: number;
};

export function normalizeClientActionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, 120);
  return normalized || null;
}

export function shouldReplayPaperAction(
  storedActionId: string | null | undefined,
  requestActionId: string,
): "replay" | "claim" | "conflict" {
  if (!storedActionId) return "claim";
  return storedActionId === requestActionId ? "replay" : "conflict";
}

export function replayCompletion(verdict: PaperActionReplay["verdict"]) {
  return verdict === "correct";
}
