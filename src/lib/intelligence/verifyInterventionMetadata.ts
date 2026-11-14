export type VerifyInterventionMetadata = {
  interventionId?: string;
  interventionLevel?: "hint" | "method" | "solution";
  interventionToAttemptHours?: number;
  freshTransfer?: boolean;
};

/**
 * Keep client-supplied intervention links small and well-formed.
 * This validates shape only: it does not treat client metadata as proof
 * that help caused an improvement or that a transfer answer was correct.
 */
export function sanitizeVerifyInterventionMetadata(
  metadata: Record<string, string | number | boolean | null> | undefined,
  eventType: string,
): Record<string, string | number | boolean | null> | undefined {
  if (!metadata) return metadata;
  const output = { ...metadata };
  const keys = ["interventionId", "interventionLevel", "interventionToAttemptHours", "freshTransfer"];
  if (eventType !== "question.attempted") {
    keys.forEach(key => delete output[key]);
    return output;
  }

  const id = output.interventionId;
  const level = output.interventionLevel;
  const hours = output.interventionToAttemptHours;
  const transfer = output.freshTransfer;
  const valid = typeof id === "string" && /^vi_[a-z0-9_-]{6,80}$/i.test(id) &&
    (level === "hint" || level === "method" || level === "solution") &&
    typeof hours === "number" && Number.isFinite(hours) && hours >= 0 && hours <= 336 &&
    typeof transfer === "boolean";

  if (!valid) {
    keys.forEach(key => delete output[key]);
    return output;
  }
  return output;
}
