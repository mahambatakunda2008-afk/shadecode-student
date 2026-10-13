/**
 * A lesson checkpoint is resumable only after real section content has been
 * stored. The initial progress marker (completedUnits: 0) is not a checkpoint.
 */
export function hasCompletedLessonCheckpoint(partial: unknown): boolean {
  if (!partial || typeof partial !== "object") return false;
  const checkpoint = partial as Record<string, unknown>;
  return typeof checkpoint.completedUnits === "number"
    && Number.isFinite(checkpoint.completedUnits)
    && checkpoint.completedUnits > 0
    && Array.isArray(checkpoint.blocks)
    && checkpoint.blocks.length > 0;
}
