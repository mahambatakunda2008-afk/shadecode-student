const USER_ID_KEY = "shadecode:active-user-id";

export function rememberActiveUser(userId: string): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(USER_ID_KEY, userId); } catch {}
}

export function getRememberedUserId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(USER_ID_KEY); } catch { return null; }
}

export function clearRememberedUser(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(USER_ID_KEY); } catch {}
}
