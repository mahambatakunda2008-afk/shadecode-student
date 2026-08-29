import type { LocalMutation } from "./storagePolicy";

const STORAGE_KEY = "shadecode:offline:mutations:v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readPendingMutations(): LocalMutation[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalMutation[]) : [];
  } catch {
    return [];
  }
}

export function enqueueMutation(mutation: LocalMutation): void {
  if (!canUseStorage()) return;
  const current = readPendingMutations();
  if (current.some((item) => item.id === mutation.id)) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, mutation]));
}

export function acknowledgeMutation(id: string): void {
  if (!canUseStorage()) return;
  const remaining = readPendingMutations().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}
