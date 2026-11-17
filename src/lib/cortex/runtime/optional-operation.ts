export type OptionalOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false };

/**
 * Run non-essential enrichment without allowing its failure to discard the
 * primary result. Callers must not interpret an unavailable result as success.
 */
export async function runOptionalOperation<T>(
  operation: () => Promise<T>,
): Promise<OptionalOperationResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch {
    return { ok: false };
  }
}
