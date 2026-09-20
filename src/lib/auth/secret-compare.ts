import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a presented secret against the expected one.
 *
 * - Fails closed: a missing/empty expected secret (e.g. an unset env var) NEVER
 *   matches, so `Bearer undefined` style bypasses are impossible.
 * - Both sides are hashed first, so `timingSafeEqual` always gets equal-length
 *   buffers (it throws otherwise) and secret length is not leaked via timing.
 *
 * Server-only (Node runtime). Do not import from client components.
 */
export function secretsMatch(presented: string | null | undefined, expected: string | null | undefined): boolean {
  if (!presented || !expected) return false;
  const a = createHash("sha256").update(presented, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
