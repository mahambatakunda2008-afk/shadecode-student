/**
 * src/lib/async/fetchWithTimeout.ts
 *
 * Client-side equivalent of the AbortController pattern already used
 * server-side in src/lib/ai.ts. That pattern isn't importable into
 * client components as-is (mixed concerns with server provider logic),
 * and a repo-wide search found zero AbortController usage anywhere in
 * src/app -- every page-level fetch() call to an API route has no
 * client-side bound at all. A slow/stalled request (AI provider
 * fallback chain taking a while, a network stall) leaves the calling
 * page's loading state true indefinitely with no way for the user to
 * know something's wrong or recover -- the same "hangs forever" failure
 * mode found and fixed in the dashboard (src/lib/async/withTimeout.ts),
 * just at the fetch layer instead of the Promise-composition layer.
 *
 * This does not change what the server does -- routes like exam/mark
 * already have their own maxDuration bound. This bounds what the
 * *client* waits for, independently, so the UI always reaches a
 * terminal state.
 */

export class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new FetchTimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
