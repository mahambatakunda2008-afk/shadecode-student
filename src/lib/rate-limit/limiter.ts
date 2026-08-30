/** In-memory sliding-window rate limiting for single-instance/serverless execution. */
interface RateLimitEntry { count: number; windowStart: number; }
interface RateLimitConfig { windowMs: number; maxRequests: number; }

export class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly config: RateLimitConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    if (typeof setInterval !== "undefined") {
      this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
      // Do not keep a Node process alive solely because of rate-limit cleanup.
      const timer = this.cleanupTimer as ReturnType<typeof setInterval> & { unref?: () => void };
      timer.unref?.();
    }
  }

  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.store.set(identifier, { count: 1, windowStart: now });
      return { success: true, remaining: Math.max(0, this.config.maxRequests - 1), resetTime: now + this.config.windowMs };
    }
    if (entry.count >= this.config.maxRequests) return { success: false, remaining: 0, resetTime: entry.windowStart + this.config.windowMs };
    entry.count += 1;
    return { success: true, remaining: Math.max(0, this.config.maxRequests - entry.count), resetTime: entry.windowStart + this.config.windowMs };
  }

  reset(identifier: string): void { this.store.delete(identifier); }
  getStoreSize(): number { return this.store.size; }
  getConfig(): Readonly<RateLimitConfig> { return this.config; }
  private cleanup(): void { const now = Date.now(); for (const [key, entry] of this.store) if (now - entry.windowStart >= this.config.windowMs) this.store.delete(key); }
}

export const aiEndpointLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });
export const generalApiLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 100 });
export const authLimiter = new RateLimiter({ windowMs: 15 * 60_000, maxRequests: 5 });

/** Uses the complete bearer token only as a server-local identifier; never logs or returns it. */
export function extractIdentifier(req: Request): string {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.length > 7) return `user-token:${authHeader.slice(7)}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

export async function applyRateLimit(req: Request, limiter: RateLimiter): Promise<Response | null> {
  const result = limiter.check(extractIdentifier(req));
  const retryAfter = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
  if (!result.success) return new Response(JSON.stringify({ error: "Too many requests", message: "Rate limit exceeded. Please try again later.", retryAfter }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(limiter.getConfig().maxRequests), "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": new Date(result.resetTime).toUTCString() } });
  return null;
}

export function mergeRateLimitHeaders(response: Response, limiter: RateLimiter, identifier: string): Response {
  const result = limiter.check(identifier);
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(limiter.getConfig().maxRequests));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", new Date(result.resetTime).toUTCString());
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
