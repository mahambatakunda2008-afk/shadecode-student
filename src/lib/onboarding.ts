/**
 * Client-side onboarding hint only.
 *
 * Account-level onboarding state is authoritative in `user_profiles` and is
 * enforced by middleware/server routes. This local flag must never be used as
 * an authorization decision.
 */
export function getOnboardingStatus(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("shadecode_onboarded") === "true";
}

export function setOnboardingComplete(): void {
  localStorage.setItem("shadecode_onboarded", "true");
}

export function clearOnboardingComplete(): void {
  localStorage.removeItem("shadecode_onboarded");
}
