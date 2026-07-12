/**
 * /lib/cortex/cache.ts
 *
 * Response Caching System for Cost Reduction
 *
 * Responsibility:
 * - Cache AI-generated responses
 * - Manage cache expiration (TTL)
 * - Track cache hits/misses
 * - Reduce API calls by 40-60%
 */

export interface CacheEntry {
  key: string;
  content: string;
  type: "lesson" | "question" | "response" | "feedback";
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  estimatedSavings: number; // in API calls
  averageSize: number; // bytes
}

/**
 * In-memory response cache with TTL and automatic cleanup
 *
 * Design:
 * - Single cache store per server instance
 * - Automatic TTL-based expiration
 * - Configurable size limits
 * - Simple key-based lookup
 *
 * Note: For distributed systems, upgrade to Redis
 */
export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private readonly MAX_ENTRIES = 500;
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic cleanup every 1 hour
    this.startCleanup();
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[ResponseCache] Cleaned up ${removedCount} expired entries`);
    }
  }

  /**
   * Generate cache key from topic, level, and format
   */
  private generateKey(topic: string, level: string, format: string, userId?: string): string {
    const parts = [topic.toLowerCase().replace(/\s+/g, "_"), level, format];
    if (userId) {
      parts.push(userId);
    }
    return `lesson:${parts.join(":")}`;
  }

  /**
   * Get entry from cache
   * @returns cached content or null if expired/not found
   */
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hitCount++;
    this.stats.hits++;

    return entry.content;
  }

  /**
   * Set entry in cache
   */
  async set(
    key: string,
    value: string,
    type: "lesson" | "question" | "response" | "feedback" = "lesson",
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictOldest(10); // Remove oldest 10
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.DEFAULT_TTL_MS));

    const entry: CacheEntry = {
      key,
      content: value,
      type,
      createdAt: now,
      expiresAt,
      hitCount: 0,
      metadata,
    };

    this.cache.set(key, entry);
  }

  /**
   * Remove oldest entries from cache
   */
  private evictOldest(count: number): void {
    let removed = 0;
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    for (const [key] of entries) {
      if (removed >= count) break;
      this.cache.delete(key);
      removed++;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Clear cache for specific type
   */
  async clearByType(type: "lesson" | "question" | "response" | "feedback"): Promise<void> {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.type === type) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.content.length;
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      totalEntries: this.cache.size,
      hitCount: this.stats.hits,
      missCount: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      estimatedSavings: this.stats.hits, // Each hit = 1 saved API call
      averageSize: this.cache.size > 0 ? Math.round(totalSize / this.cache.size) : 0,
    };
  }

  /**
   * Get cache entry info (for debugging)
   */
  getEntry(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  /**
   * List all cache keys
   */
  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get size of cache in bytes
   */
  getSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.content.length;
    }
    return size;
  }

  /**
   * Destroy cache and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Global cache instance (singleton)
 * WARNING: This is in-memory only. For production with multiple servers, use Redis.
 */
let globalCache: ResponseCache | null = null;

export function getCache(): ResponseCache {
  if (!globalCache) {
    globalCache = new ResponseCache();
  }
  return globalCache;
}

/**
 * Check if response should be cached
 */
export function shouldCache(content: string, type: string): boolean {
  // Cache if content is substantial and type is appropriate
  if (!content || content.length < 100) return false;
  if (!["lesson", "question", "response", "feedback"].includes(type)) return false;

  // Lessons and feedback should always be cached
  if (type === "lesson" || type === "feedback") return true;

  return true;
}

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(
  topic: string,
  level: string,
  format: string,
  userId?: string
): string {
  const parts = [topic.toLowerCase().replace(/\s+/g, "_"), level, format];
  if (userId) {
    parts.push(userId);
  }
  return `cache:${parts.join(":")}`;
}
