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

// ─── upsertWeakAreas ──────────────────────────────────────────────────────────

/**
 * Called after a successful exam_results insert.
 * For each weak area:
 *   - If (user_id, topic, subject) exists → priority += 1, last_seen = now
 *   - If not → insert with priority = 1, source = "exam"
 *
 * Never throws. All errors are logged silently so they never
 * interrupt the exam save flow that calls this.
 */
export async function upsertWeakAreas(
  userId: string,
  subject: string,
  weakAreas: string[]
): Promise<void> {
  if (!userId || !subject || !weakAreas || weakAreas.length === 0) return;

  const supabase = createClient();
  const now = new Date().toISOString();

  // Process all weak areas in parallel — one failure never blocks others
  await Promise.allSettled(
    weakAreas.map(async (rawTopic) => {
      const topic = rawTopic.trim();
      if (!topic) return;

      // Check for existing row
      const { data: existing, error: fetchError } = await supabase
        .from("revision_queue")
        .select("id, priority")
        .eq("user_id", userId)
        .eq("topic", topic)
        .eq("subject", subject)
        .maybeSingle();

      if (fetchError) {
        console.error("[RevisionQueue] fetch error:", fetchError.message);
        return;
      }

      if (existing) {
        // Row exists — bump priority and refresh last_seen
        const { error: updateError } = await supabase
          .from("revision_queue")
          .update({
            priority: existing.priority + 1,
            last_seen: now,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("[RevisionQueue] update error:", updateError.message);
        }
      } else {
        // New weak area — insert fresh row
        const { error: insertError } = await supabase
          .from("revision_queue")
          .insert({
            user_id: userId,
            topic,
            subject,
            priority: 1,
            source: "exam" as const,
            last_seen: now,
          });

        if (insertError) {
          console.error("[RevisionQueue] insert error:", insertError.message);
        }
      }
    })
  );
}

// ─── getRevisionQueue ─────────────────────────────────────────────────────────

/**
 * Fetches top N revision items for a user, ordered by priority desc.
 * Returns empty array on any error — safe to call in dashboard renders.
 */
export async function getRevisionQueue(
  userId: string,
  limit = 5
): Promise<RevisionItem[]> {
  if (!userId) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from("revision_queue")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[RevisionQueue] getRevisionQueue error:", error.message);
    return [];
  }

  return (data as RevisionItem[]) ?? [];
}

// ─── markRevised ─────────────────────────────────────────────────────────────

/**
 * Resets priority to 1 and updates last_seen when user clicks "Revise →".
 * Non-blocking — called fire-and-forget from the component.
 */
export async function markRevised(itemId: string): Promise<void> {
  if (!itemId) return;

  const supabase = createClient();

  const { error } = await supabase
    .from("revision_queue")
    .update({
      priority: 1,
      last_seen: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    console.error("[RevisionQueue] markRevised error:", error.message);
  }
}
