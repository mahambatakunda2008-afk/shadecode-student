import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RevisionItem {
  id: string;
  user_id: string;
  topic: string;
  subject: string;
  priority: number;
  source: "exam" | "cortex" | "manual";
  last_seen: string;
  created_at: string;
}

// Valid source values — enforced by the DB check constraint
type RevisionSource = "exam" | "cortex" | "manual";

// ─── Input validation ─────────────────────────────────────────────────────────

/**
 * Sanitises a raw weakAreas value from the AI marking API response.
 *
 * Handles every malformed shape observed in practice:
 *   - null / undefined          → []
 *   - non-array (string/object) → []
 *   - array with null elements  → filtered out
 *   - array with empty strings  → filtered out
 *   - array with non-strings    → coerced to string, then filtered
 *
 * Returns a deduplicated array of trimmed, non-empty strings.
 */
function sanitiseWeakAreas(raw: unknown): string[] {
  // Reject non-arrays outright
  if (!Array.isArray(raw)) {
    if (raw !== null && raw !== undefined) {
      console.warn("[RevisionQueue] weakAreas is not an array:", typeof raw, raw);
    }
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    // Coerce to string — handles numbers, booleans, etc. from malformed AI output
    if (item === null || item === undefined) continue;
    const str = String(item).trim();
    if (!str) continue;
    // Deduplicate within a single exam's weak areas
    if (seen.has(str)) continue;
    seen.add(str);
    result.push(str);
  }

  return result;
}

/**
 * Validates base parameters shared by all exported functions.
 * Returns a string describing the first violation, or null if valid.
 */
function validateBaseParams(userId: unknown, subject: unknown): string | null {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return "userId must be a non-empty string";
  }
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    return "subject must be a non-empty string";
  }
  return null;
}

// ─── upsertWeakAreas ──────────────────────────────────────────────────────────

/**
 * Atomically upserts each weak area into the revision queue via Postgres RPC.
 *
 * Concurrency safety:
 *   Delegates to upsert_revision_item() which uses INSERT ... ON CONFLICT
 *   DO UPDATE. This is a single atomic operation in Postgres — no two
 *   concurrent calls can both INSERT for the same (user_id, topic, subject).
 *   The loser of the race hits the ON CONFLICT path and increments priority
 *   instead of creating a duplicate row.
 *
 * Never throws — all errors are logged and swallowed so they never
 * interrupt the exam submission flow that calls this fire-and-forget.
 */
export async function upsertWeakAreas(
  userId: string,
  subject: string,
  weakAreas: unknown,
  source: RevisionSource = "exam"
): Promise<void> {
  // ── Validate base params ─────────────────────────────────────────────────
  const baseError = validateBaseParams(userId, subject);
  if (baseError) {
    console.error("[RevisionQueue] upsertWeakAreas: invalid params —", baseError, { userId, subject });
    return;
  }

  // ── Sanitise weak areas input ────────────────────────────────────────────
  const topics = sanitiseWeakAreas(weakAreas);

  if (topics.length === 0) {
    // Not an error — exams with no weak areas are valid
    return;
  }

  const supabase = createClient();

  // ── Fire all upserts in parallel via atomic RPC ──────────────────────────
  // Promise.allSettled ensures one failure never cancels the others.
  const results = await Promise.allSettled(
    topics.map(topic =>
      supabase.rpc("upsert_revision_item", {
        p_user_id: userId,
        p_topic:   topic,
        p_subject: subject.trim(),
        p_source:  source,
      })
    )
  );

  // ── Log any per-topic failures without throwing ──────────────────────────
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        "[RevisionQueue] upsertWeakAreas: RPC rejected for topic:",
        topics[i],
        result.reason
      );
      return;
    }
    if (result.value.error) {
      console.error(
        "[RevisionQueue] upsertWeakAreas: RPC error for topic:",
        topics[i],
        {
          code:    result.value.error.code,
          message: result.value.error.message,
          details: result.value.error.details,
        }
      );
    }
  });
}

// ─── getRevisionQueue ─────────────────────────────────────────────────────────

/**
 * Fetches the top N revision items for a user, ordered by priority desc,
 * then last_seen desc as tiebreaker.
 *
 * Returns [] on any error — safe to call in dashboard renders where
 * a failed fetch must not crash the page.
 */
export async function getRevisionQueue(
  userId: string,
  limit = 5
): Promise<RevisionItem[]> {
  const baseError = validateBaseParams(userId, "placeholder");
  // Only validate userId for this function
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    console.error("[RevisionQueue] getRevisionQueue: invalid userId —", userId);
    return [];
  }

  if (typeof limit !== "number" || limit < 1 || limit > 100) {
    console.warn("[RevisionQueue] getRevisionQueue: invalid limit, defaulting to 5 —", limit);
    limit = 5;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("revision_queue")
    .select("*")
    .eq("user_id", userId)
    .order("priority",  { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[RevisionQueue] getRevisionQueue: query error —", {
      code:    error.code,
      message: error.message,
      details: error.details,
    });
    return [];
  }

  return (data as RevisionItem[]) ?? [];
}

// ─── markRevised ─────────────────────────────────────────────────────────────

/**
 * Resets an item's priority to 1 and updates last_seen when a user
 * clicks "Revise →". Called fire-and-forget from the component.
 *
 * Uses .eq("user_id") as an additional RLS-level guard so a user
 * cannot reset another user's item even with a guessed itemId.
 */
export async function markRevised(
  itemId: string,
  userId: string
): Promise<void> {
  if (!itemId || typeof itemId !== "string" || !itemId.trim()) {
    console.error("[RevisionQueue] markRevised: invalid itemId —", itemId);
    return;
  }
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    console.error("[RevisionQueue] markRevised: invalid userId —", userId);
    return;
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("revision_queue")
    .update({
      priority:  1,
      last_seen: new Date().toISOString(),
    })
    .eq("id",      itemId)
    .eq("user_id", userId); // ownership guard

  if (error) {
    console.error("[RevisionQueue] markRevised: update error —", {
      itemId,
      code:    error.code,
      message: error.message,
    });
  }
}
