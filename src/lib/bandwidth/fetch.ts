/**
 * /lib/bandwidth/fetch.ts
 *
 * Bandwidth-aware fetch wrapper
 */

import { bandwidthDetector, BandwidthInfo } from "./detector";

interface BandwidthFetchOptions extends RequestInit {
  lowBandwidth?: boolean;
  compress?: boolean;
  cacheFirst?: boolean;
}

class BandwidthFetch {
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async fetch(url: string, options: BandwidthFetchOptions = {}): Promise<Response> {
    const { lowBandwidth, compress = true, cacheFirst = false, ...fetchOptions } = options;
    const shouldUseLowBandwidth = lowBandwidth ?? bandwidthDetector.shouldUseLowBandwidthMode();

    // Check cache first if enabled
    if (cacheFirst || shouldUseLowBandwidth) {
      const cached = this.getFromCache(url);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: new Headers({
            "Content-Type": "application/json",
            "X-Cache": "HIT",
          }),
        });
      }
    }

    // Prepare headers for low-bandwidth mode
    const headers = new Headers(fetchOptions.headers);
    
    if (shouldUseLowBandwidth) {
      // Request compressed responses
      if (compress) {
        headers.set("Accept-Encoding", "gzip, deflate, br");
      }
      
      // Request minimal data
      headers.set("X-Low-Bandwidth", "true");
      headers.set("X-Minimal-Data", "true");
    }

    // Make the fetch request
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Cache successful responses
    if (response.ok && (cacheFirst || shouldUseLowBandwidth)) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        this.setCache(url, data);
      } catch (error) {
        // If response is not JSON, don't cache
      }
    }

    return response;
  }

  private getFromCache(url: string): any | null {
    const cached = this.requestCache.get(url);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.requestCache.delete(url);
      return null;
    }

    return cached.data;
  }

  private setCache(url: string, data: any): void {
    this.requestCache.set(url, {
      data,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.requestCache.size > 100) {
      const oldestKey = this.requestCache.keys().next().value;
      if (oldestKey) {
        this.requestCache.delete(oldestKey);
      }
    }
  }

  clearCache(): void {
    this.requestCache.clear();
  }

  getCacheSize(): number {
    return this.requestCache.size;
  }

  // Batch multiple requests to reduce network overhead
  async batchFetch(urls: string[], options: BandwidthFetchOptions = {}): Promise<Response[]> {
    const { lowBandwidth, ...fetchOptions } = options;
    const shouldUseLowBandwidth = lowBandwidth ?? bandwidthDetector.shouldUseLowBandwidthMode();

    if (shouldUseLowBandwidth) {
      // In low-bandwidth mode, fetch sequentially to avoid congestion
      const responses: Response[] = [];
      for (const url of urls) {
        const response = await this.fetch(url, { ...fetchOptions, lowBandwidth: true });
        responses.push(response);
      }
      return responses;
    }

    // In normal mode, fetch in parallel
    return Promise.all(urls.map(url => this.fetch(url, options)));
  }

  // Prefetch resources for better performance
  async prefetch(urls: string[]): Promise<void> {
    const shouldUseLowBandwidth = bandwidthDetector.shouldUseLowBandwidthMode();
    
    if (shouldUseLowBandwidth) {
      // Don't prefetch in low-bandwidth mode
      return;
    }

    // Prefetch in background with low priority
    const prefetchPromises = urls.map(url =>
      this.fetch(url, { cacheFirst: true }).catch(() => {
        // Silently fail prefetch requests
      })
    );

    await Promise.all(prefetchPromises);
  }
}

export const bandwidthFetch = new BandwidthFetch();
