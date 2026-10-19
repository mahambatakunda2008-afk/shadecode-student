/**
 * Run non-critical effects after a primary operation has already committed.
 * Rejections are reported to the caller but never reject this helper itself.
 */
export async function runBestEffortSideEffects(
  effects: Array<Promise<unknown>>,
  onFailure: (error: unknown, index: number) => void = () => undefined,
): Promise<void> {
  const results = await Promise.allSettled(effects);
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      try {
        onFailure(result.reason, index);
      } catch {
        // Logging/telemetry callbacks must not invalidate the committed operation.
      }
    }
  });
}
