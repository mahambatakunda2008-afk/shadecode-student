import { createClient } from "@/lib/supabase/client";
import { log } from "@/lib/observability";

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

type RevisionSource = "exam" | "cortex" | "manual";

// ─── Input validation ─────────────────────────────────────────────────────────

function sanitiseWeakAreas(
  raw: unknown,
  userId: string,
  subject: string
): string[] {
  if (!Array.isArray(raw)) {
    if (raw !== null && raw !== undefined) {
      log.revisionInvalidInput({
        userId,
        subject,
        rawInput: raw,
        reason: `expected array, got ${typeof raw}`,
      });
    }
    return [];
  }

  const seen   = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    if (item === null || item === undefined) continue;
    const str = String(item).trim();
    if (!str) continue;
    if (seen.has(str)) continue;
    seen.add(str);
    result.push(str);
  }

  return result;
}

function validateUserId(userId: unknown): userId is string {
  return typeof userId === "string" && userId.trim().length > 0;
}

function validateSubject(subject: unknown): subject is string {
  return typeof subject === "string" && subject.trim().length > 0;
}

// ─── upsertWeakAreas ──────────────────────────────────────────────────────────

export async function upsertWeakAreas(
  userId: string,
  subject: string,
  weakAreas: unknown,
  source: RevisionSource = "exam"
): Promise<void> {
  if (!validateUserId(userId) || !validateSubject(subject)) {
    log.revisionInvalidInput({
      userId:   String(userId),
      subject:  String(subject),
      rawInput: null,
      reason:   "userId or subject is empty/invalid",
    });
    return;
  }

  const topics = sanitiseWeakAreas(weakAreas, userId, subject);
  if (topics.length === 0) return;

  const supabase = createClient();

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

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      log.revisionUpsertFailed({
        userId,
        topic:   topics[i],
        subject,
        message: String(result.reason),
      });
      return;
    }
    if (result.value.error) {
      log.revisionUpsertFailed({
        userId,
        topic:   topics[i],
        subject,
        code:    result.value.error.code,
        message: result.value.error.message,
      });
    }
  });
}

// ─── getRevisionQueue ─────────────────────────────────────────────────────────

export async function getRevisionQueue(
  userId: string,
  limit  = 5
): Promise<RevisionItem[]> {
  if (!validateUserId(userId)) return [];

  const safeLimit = typeof limit === "number" && limit > 0 && limit <= 100
    ? limit
    : 5;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("revision_queue")
    .select("*")
    .eq("user_id", userId)
    .order("priority",  { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(safeLimit);

  if (error) {
    log.revisionUpsertFailed({
      userId,
      topic:   "(fetch)",
      subject: "(fetch)",
      code:    error.code,
      message: error.message,
    });
    return [];
  }

  return (data as RevisionItem[]) ?? [];
}

// ─── markRevised ─────────────────────────────────────────────────────────────

export async function markRevised(
  itemId: string,
  userId: string
): Promise<void> {
  if (!itemId?.trim() || !validateUserId(userId)) {
    log.revisionInvalidInput({
      userId:   String(userId),
      subject:  "(markRevised)",
      rawInput: { itemId },
      reason:   "itemId or userId is empty",
    });
    return;
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("revision_queue")
    .update({
      priority:  1,
      // last_seen omitted — let DB trigger or RPC handle if needed.
      // For a simple update this is fine client-side since it's not
      // used in ordering logic during the reset path.
      last_seen: new Date().toISOString(),
    })
    .eq("id",      itemId)
    .eq("user_id", userId);

  if (error) {
    log.revisionUpsertFailed({
      userId,
      topic:   "(markRevised)",
      subject: "(markRevised)",
      code:    error.code,
      message: error.message,
    });
  }
}
