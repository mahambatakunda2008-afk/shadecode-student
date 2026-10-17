/**
 * Fast authored-curriculum recovery is the offline/unauthenticated lane.
 * An authenticated online learner should get a real Cortex generation attempt
 * first; the API can still return a verified curated lesson if providers fail.
 */
export function shouldUseFastVerifiedCurriculumRecovery(input: {
  online: boolean;
  hasSessionToken: boolean;
}): boolean {
  return !input.online || !input.hasSessionToken;
}
