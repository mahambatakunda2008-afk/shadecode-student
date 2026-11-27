/**
 * Fast authored-curriculum recovery is strictly an offline lane.
 * Missing authentication while online must not masquerade as a successful
 * generated lesson; the caller should surface the sign-in requirement instead.
 */
export function shouldUseFastVerifiedCurriculumRecovery(input: {
  online: boolean;
  hasSessionToken: boolean;
}): boolean {
  return !input.online;
}
