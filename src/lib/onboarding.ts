export function getOnboardingStatus() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("shadecode_onboarded") === "true";
}

export function setOnboardingComplete() {
  localStorage.setItem("shadecode_onboarded", "true");
}
