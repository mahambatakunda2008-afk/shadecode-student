export type PaperStatePatch = Partial<{
  bookmarked: boolean;
  status: "not_started" | "in_progress" | "completed";
  last_page: number;
  score: number;
  time_spent_seconds: number;
  downloaded_offline: boolean;
}>;

const ALLOWED_STATUSES = new Set(["not_started", "in_progress", "completed"]);

type PatchParseResult = { patch: PaperStatePatch; error?: never } | { patch?: never; error: string };

/** Validate untrusted JSON before it is sent to the database. */
export function parsePaperStatePatch(value: unknown): PatchParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Request body must be a JSON object" };
  }

  const input = value as Record<string, unknown>;
  const patch: PaperStatePatch = {};

  if (input.bookmarked !== undefined) {
    if (typeof input.bookmarked !== "boolean") return { error: "bookmarked must be a boolean" };
    patch.bookmarked = input.bookmarked;
  }
  if (input.downloaded_offline !== undefined) {
    if (typeof input.downloaded_offline !== "boolean") return { error: "downloaded_offline must be a boolean" };
    patch.downloaded_offline = input.downloaded_offline;
  }
  if (input.status !== undefined) {
    if (typeof input.status !== "string" || !ALLOWED_STATUSES.has(input.status)) {
      return { error: "status must be not_started, in_progress, or completed" };
    }
    patch.status = input.status as PaperStatePatch["status"];
  }
  if (input.last_page !== undefined) {
    if (typeof input.last_page !== "number" || !Number.isInteger(input.last_page) || input.last_page < 0) {
      return { error: "last_page must be a non-negative integer" };
    }
    patch.last_page = input.last_page;
  }
  if (input.score !== undefined) {
    if (typeof input.score !== "number" || !Number.isFinite(input.score) || input.score < 0 || input.score > 100) {
      return { error: "score must be a finite number between 0 and 100" };
    }
    patch.score = input.score;
  }
  if (input.time_spent_seconds !== undefined) {
    if (typeof input.time_spent_seconds !== "number" || !Number.isFinite(input.time_spent_seconds) || input.time_spent_seconds < 0) {
      return { error: "time_spent_seconds must be a non-negative finite number" };
    }
    patch.time_spent_seconds = input.time_spent_seconds;
  }

  if (Object.keys(patch).length === 0) return { error: "No valid fields in request" };
  return { patch };
}

export type PaperScoreEntry = { paper_id?: string; subject: string; score: number; recorded_at: string };

/**
 * A paper-state row stores the latest state for one paper, not every attempt.
 * Replace the matching paper's rollup entry instead of adding a duplicate
 * whenever a client retries the same completion update.
 */
export function mergePaperScoreHistory(
  existing: unknown,
  paperId: string,
  subject: string,
  score: number,
  recordedAt: string,
): PaperScoreEntry[] {
  const entries: PaperScoreEntry[] = Array.isArray(existing)
    ? existing.filter((item): item is PaperScoreEntry =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as PaperScoreEntry).subject === "string" &&
        typeof (item as PaperScoreEntry).score === "number" &&
        typeof (item as PaperScoreEntry).recorded_at === "string"
      )
    : [];
  const withoutThisPaper = entries.filter((entry) => entry.paper_id !== paperId);
  return [...withoutThisPaper, { paper_id: paperId, subject, score, recorded_at: recordedAt }].slice(-50);
}
