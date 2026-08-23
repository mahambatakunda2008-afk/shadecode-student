import { createClient } from "@/lib/supabase/client";
import type { LearningEvidence } from "./evidence";

/**
 * Best-effort bridge from StudySpace evidence into the existing topic_mastery
 * table consumed by Cortex retention risk and recommendations.
 *
 * StudySpace persistence remains authoritative. A mastery-sync failure is
 * intentionally non-blocking so students can always submit their work.
 */
export async function updateTopicMasteryFromEvidence(
  userId: string,
  evidence: LearningEvidence,
): Promise<void> {
  if (!evidence.subject || !evidence.topic || evidence.percentage == null) return;

  try {
    const supabase = createClient();
    const subject = evidence.subject.trim();
    const topic = evidence.topic.trim();
    if (!subject || !topic) return;

    const score = Math.max(0, Math.min(100, evidence.percentage));
    const now = new Date().toISOString();

    const { data: existing, error: lookupError } = await supabase
      .from("topic_mastery")
      .select("id, mastery_score")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("topic", topic)
      .maybeSingle();

    if (lookupError) {
      console.error("[StudySpace] topic mastery lookup failed:", lookupError);
      return;
    }

    const previous = typeof existing?.mastery_score === "number" ? existing.mastery_score : undefined;
    const blendedScore = previous === undefined ? score : Math.round(previous * 0.4 + score * 0.6);
    const trend = previous === undefined ? "stable" : score > previous + 3 ? "improving" : score < previous - 3 ? "declining" : "stable";

    const payload = {
      user_id: userId,
      subject,
      topic,
      mastery_score: blendedScore,
      last_attempted: now,
      trend,
    };

    const result = existing
      ? await supabase.from("topic_mastery").update(payload).eq("id", existing.id)
      : await supabase.from("topic_mastery").insert(payload);

    if (result.error) {
      console.error("[StudySpace] topic mastery sync failed:", result.error);
    }
  } catch (error) {
    console.error("[StudySpace] topic mastery sync failed:", error);
  }
}
