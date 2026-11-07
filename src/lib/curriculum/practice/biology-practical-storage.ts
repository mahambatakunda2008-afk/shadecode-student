export type PracticalStorageKeys = {
  attempt: string;
  drawingPrefix: string;
  graphPrefix: string;
};

/**
 * Keep all offline practical work under the authenticated learner's namespace.
 * Never fall back to a shared device-wide key: shared browsers may be used by
 * multiple students, and their answers, ratings and workspace drafts are private.
 */
export function getPracticalStorageKeys(userId: string, practiceSetId: string): PracticalStorageKeys {
  const learnerId = userId.trim();
  const setId = practiceSetId.trim();
  if (!learnerId || !setId) throw new Error("A learner ID and practice-set ID are required for private practical storage.");

  const namespace = `${encodeURIComponent(learnerId)}:${encodeURIComponent(setId)}`;
  return {
    attempt: `shadecode:practical-attempt:${namespace}`,
    drawingPrefix: `shadecode:practical-drawing:${namespace}:`,
    graphPrefix: `shadecode:practical-graph:${namespace}:`,
  };
}
