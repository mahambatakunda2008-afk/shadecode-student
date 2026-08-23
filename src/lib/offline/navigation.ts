export const OFFLINE_NAVIGATION_TIMEOUT_MS = 1800;

export function isDocumentNavigation(request: Request): boolean {
  return request.mode === "navigate";
}

export function isSafeOfflineRoute(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("/api/");
}

export function shouldUseOfflineFallback(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return error instanceof TypeError;
}
