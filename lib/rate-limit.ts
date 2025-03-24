/**
 * Simple rate limiting utility for API routes
 * Inspired by the lru-cache and rate-limit libraries
 */
import { LRUCache } from 'lru-cache';

export interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval?: number; // Max number of unique tokens per interval
}

export interface RateLimiter {
  check: (limit: number, token: string) => Promise<void>;
}

export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval,
  });

  return {
    check: async (limit: number, token: string): Promise<void> => {
      const now = Date.now();
      const timestamps = tokenCache.get(token) || [];
      
      // Remove timestamps older than the interval
      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < options.interval
      );
      
      // Check if we're over the limit
      if (validTimestamps.length >= limit) {
        throw new Error('Rate limit exceeded');
      }
      
      // Add the current timestamp and update the cache
      tokenCache.set(token, [...validTimestamps, now]);
    },
  };
} 