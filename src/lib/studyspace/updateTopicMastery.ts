import { createClient } from "@/lib/supabase/client";
import type { LearningEvidence } from "./evidence";
import { blendMastery } from "@/lib/topicMastery/blend";
import { canonicalLabel } from "@/lib/topicMastery/canonical";

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
    const subject = canonicalLabel(evidence.subject);
    const topic = canonicalLabel(evidence.topic);
    if (!subject || !topic) return;

    const now = new Date().toISOString();

    const { data: existing, error: lookupError } = await supabase
      .from("topic_mastery")
      .select("id, mastery_score, attempts")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("topic", topic)
      .maybeSingle();

    if (lookupError) {
      console.error("[StudySpace] topic mastery lookup failed:", lookupError);
      return;
    }

    // Shared EMA + numeric trend: `topic_mastery.trend` is a numeric column, so
    // the previous string labels ("stable"/"improving") made every write fail.
    const update = blendMastery(
      existing ? { mastery_score: Number(existing.mastery_score), attempts: Number(existing.attempts ?? 0) } : null,
      evidence.percentage,
    );

    const payload = {
      user_id: userId,
      subject,
      topic,
      ...update,
      last_attempted: now,
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
