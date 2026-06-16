/**
 * In-Memory Sliding Window Rate Limiter
 * 
 * Provides rate limiting using a sliding window algorithm without external dependencies.
 * Suitable for single-instance deployments. For multi-instance deployments, consider
 * upgrading to Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (user ID, IP address, etc.)
   * @returns Object with success status and metadata
   */
  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // If no entry exists or window has expired, create new entry
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.store.set(identifier, {
        count: 1,
        windowStart: now,
      });
      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.windowStart + this.config.windowMs,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(identifier, entry);

    return {
      success: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.windowStart + this.config.windowMs,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart >= this.config.windowMs) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }
}

// Pre-configured limiters for different use cases
export const aiEndpointLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for AI endpoints
});

export const generalApiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute for general APIs
});

export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes for auth endpoints
});

/**
 * Extract identifier from request for rate limiting
 * Priority: User ID (from auth) > IP address
 */
export function extractIdentifier(req: Request): string {
  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // In a real implementation, you'd decode the JWT to get the user ID
    // For now, use the token as identifier
    return `user:${authHeader.slice(7)}`;
  }

  // Fallback to IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
  return `ip:${ip}`;
}

/**
 * Middleware function to apply rate limiting
 * @param req - The request object
 * @param limiter - The rate limiter instance to use
 * @returns Response object if rate limited, null if allowed
 */
export async function applyRateLimit(
  req: Request,
  limiter: RateLimiter
): Promise<Response | null> {
  const identifier = extractIdentifier(req);
  const result = limiter.check(identifier);

  if (!result.success) {
    const resetTime = new Date(result.resetTime).toUTCString();
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': resetTime,
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', limiter['config'].maxRequests.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.resetTime).toUTCString());

  // Return null to indicate request is allowed
  // The caller should merge these headers into their response
  return null;
}

/**
 * Helper to merge rate limit headers into a response
 */
export function mergeRateLimitHeaders(response: Response, limiter: RateLimiter, identifier: string): Response {
  const result = limiter.check(identifier);
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-RateLimit-Limit', limiter['config'].maxRequests.toString());
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', new Date(result.resetTime).toUTCString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
