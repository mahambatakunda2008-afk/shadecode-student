/**
 * Browser-authenticated event ingress is telemetry, not an authority for marks.
 * Any correctness or marking claims must be reconstructed by a server-owned
 * assessment workflow before they can influence canonical mastery.
 */
const UNTRUSTED_EVIDENCE_FIELDS = [
  "correct",
  "evidenceScore",
  "percentage",
  "score",
  "maxScore",
  "confidence",
  "responseSeconds",
  "difficulty",
  "verified",
  "serverVerified",
  "teacherReviewed",
  "reviewerId",
  "evidenceClass",
  "markingAuthority",
  "markingMethod",
  "answerKeyVersion",
  "questionSetHash",
  "marksAwarded",
] as const;

export function sanitizeClientLearningEvidenceMetadata(
  metadata: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> | undefined {
  if (!metadata) return metadata;
  const safe = { ...metadata };
  for (const field of UNTRUSTED_EVIDENCE_FIELDS) delete safe[field];
  return safe;
}
