/**
 * Lightweight, In-Memory Sliding Window Rate Limiter (AGENTS.md §14, §15).
 *
 * Provides edge-safe and Node-safe rate limiting without external dependencies.
 * Automatically evicts stale rate-limit buckets to prevent memory leaks.
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

interface Bucket {
  tokens: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic garbage collection every 5 minutes to keep memory footprint minimal
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      // Filter out tokens older than 10 minutes
      const activeTokens = bucket.tokens.filter((timestamp) => now - timestamp < 600_000);
      if (activeTokens.length === 0) {
        buckets.delete(key);
      } else {
        bucket.tokens = activeTokens;
      }
    }
  }, 300_000);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Check and record a request against a sliding-window rate limit bucket.
 *
 * @param identifier Unique key (e.g. `userId:import` or `ip:api-general`)
 * @param config Rate limit threshold and duration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 60, windowSeconds: 60 },
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  let bucket = buckets.get(identifier);
  if (!bucket) {
    bucket = { tokens: [] };
    buckets.set(identifier, bucket);
  }

  // Remove timestamps outside the sliding window
  bucket.tokens = bucket.tokens.filter((timestamp) => timestamp > cutoff);

  if (bucket.tokens.length >= config.limit) {
    const oldestToken = bucket.tokens[0] ?? now;
    const resetSeconds = Math.ceil((oldestToken + windowMs - now) / 1000);
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  // Consume token
  bucket.tokens.push(now);

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - bucket.tokens.length,
    resetSeconds: config.windowSeconds,
  };
}

/**
 * Convenience helper to extract client IP from incoming request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
