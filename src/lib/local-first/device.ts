const STORAGE_KEY = "shadecode:device-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = randomId();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
