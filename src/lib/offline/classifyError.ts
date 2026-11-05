/**
 * Tells an offline failure from a real bug, so a student who lost signal sees "you're offline"
 * instead of "this page hit a problem", and offline noise stays out of the error tracker.
 */
export type RouteErrorKind = "offline" | "stale-build" | "other";

const CHUNK_FAILURE = /ChunkLoadError|Loading (?:CSS )?chunk [\w./-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const NETWORK_FAILURE = /Failed to fetch|NetworkError|Load failed|Network request failed|fetch failed|internet connection appears to be offline|ERR_INTERNET_DISCONNECTED|ERR_NETWORK/i;

export function classifyRouteError(error: { name?: string; message?: string } | null | undefined, online: boolean): RouteErrorKind {
  const text = `${error?.name ?? ""} ${error?.message ?? ""}`;
  const chunk = CHUNK_FAILURE.test(text);
  const network = NETWORK_FAILURE.test(text);
  if (!online && (chunk || network)) return "offline";
  // Online but a build file is missing: the app was updated while this tab was open.
  if (online && chunk) return "stale-build";
  return "other";
}
