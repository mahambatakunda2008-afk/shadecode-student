export function getOnboardingStatus() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("shadecode_onboarded") === "true";
}

export function setOnboardingComplete() {
  localStorage.setItem("shadecode_onboarded", "true");
  document.cookie = "onboarding_complete=1; path=/; max-age=31536000; SameSite=Lax";
}

export function clearOnboardingComplete() {
  localStorage.removeItem("shadecode_onboarded");
  document.cookie = "onboarding_complete=; path=/; max-age=0; SameSite=Lax";
}
