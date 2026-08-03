export interface FetchWithRetryOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryOn?: (status: number) => boolean;
  signal?: AbortSignal | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  opts: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 20000,
    retries = 2,
    retryDelayMs = 500,
    retryOn = (status: number) => status >= 500,
    signal = null,
  } = opts;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const mergedSignal = signal || null;
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Retry on specific HTTP status codes
      if (retryOn(response.status) && attempt < retries) {
        lastError = new Error(`Retrying due to status ${response.status}`);
        attempt += 1;
        await sleep(retryDelayMs * attempt);
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      // If aborted due to timeout, treat similarly to network error and retry
      if (attempt < retries) {
        attempt += 1;
        await sleep(retryDelayMs * attempt);
        continue;
      }

      throw err;
    }
  }

  // Should not reach here, but throw the last error if it did
  throw lastError;
}
