import { createClient } from "@/lib/supabase/client";

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

/**
 * Upserts weak areas from an exam result into the revision queue.
 *
 * Behaviour:
 * - If (user_id, topic, subject) does not exist → insert with priority = 1
 * - If it already exists → increment priority by 1, update last_seen
 *
 * Called after a successful exam_results insert in the exam-sim flow.
 * Does NOT throw — errors are logged silently so they never break the exam save.
 */
export async function upsertWeakAreas(
  userId: string,
  subject: string,
  weakAreas: string[]
): Promise<void> {
  if (!userId || !subject || !weakAreas || weakAreas.length === 0) return;

  const supabase = createClient();
  const now = new Date().toISOString();

  // Process each weak area independently — one failure doesn't block others
  await Promise.allSettled(
    weakAreas.map(async (topic) => {
      const trimmed = topic.trim();
      if (!trimmed) return;

      // Check if this (user, topic, subject) already exists
      const { data: existing, error: fetchError } = await supabase
        .from("revision_queue")
        .select("id, priority")
        .eq("user_id", userId)
        .eq("topic", trimmed)
        .eq("subject", subject)
        .maybeSingle();

      if (fetchError) {
        console.error("[RevisionQueue] fetch error:", fetchError.message);
        return;
      }

      if (existing) {
        // Already in queue — increment priority and refresh last_seen
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
        // New entry
        const { error: insertError } = await supabase
          .from("revision_queue")
          .insert({
            user_id: userId,
            topic: trimmed,
            subject,
            priority: 1,
            source: "exam",
            last_seen: now,
          });

        if (insertError) {
          console.error("[RevisionQueue] insert error:", insertError.message);
        }
      }
    })
  );
}

/**
 * Fetches the top N revision queue items for a user, ordered by priority desc.
 * Safe to call on dashboard — returns empty array on any error.
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

/**
 * Marks a revision item as seen — resets priority to 1 and updates last_seen.
 * Called when user clicks "Revise →" on a queue item.
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
