/**
 * src/lib/topicMastery/canonical.ts
 *
 * Single normalisation rule for the free-text `subject` / `topic` strings that
 * form the `topic_mastery` unique key (user_id, subject, topic).
 *
 * Before this existed, each writer trimmed differently, so cosmetic variants
 * ("Oscillations", "Oscillations.", "Oscillations ") became separate rows and
 * split a learner's mastery across duplicates. This is normalisation only.
 * Mapping free text onto curriculum topic keys is a separate resolver step.
 */

const MAX_LABEL_LENGTH = 160;

export function canonicalLabel(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s.,;:]+$/u, "")
    .slice(0, MAX_LABEL_LENGTH)
    .trim();
}
