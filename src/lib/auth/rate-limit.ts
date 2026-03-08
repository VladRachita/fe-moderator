/**
 * In-memory sliding-window rate limiter.
 *
 * Resets on Vercel cold starts — acceptable for MVP.
 * For durable limiting, swap to Upstash + @upstash/ratelimit.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 10;
const ACCOUNT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const ACCOUNT_MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let lastCleanup = Date.now();

const cleanup = (windowMs: number) => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export const checkRateLimit = (
  identifier: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult => {
  const now = Date.now();
  cleanup(windowMs);

  const cutoff = now - windowMs;
  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= maxAttempts) {
    const oldestInWindow = entry.timestamps[0] ?? now;
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxAttempts - entry.timestamps.length,
    retryAfterMs: 0,
  };
};

/**
 * Checks both per-IP and per-account rate limits.
 * Returns blocked if either limit is exceeded.
 * Per-account limiting prevents credential stuffing across many IPs.
 */
export const checkLoginRateLimits = (
  clientIp: string,
  identifier: string,
): RateLimitResult => {
  const ipResult = checkRateLimit(`login:${clientIp}`);
  if (!ipResult.allowed) {
    return ipResult;
  }
  const accountResult = checkRateLimit(
    `login-account:${identifier.toLowerCase()}`,
    ACCOUNT_MAX_ATTEMPTS,
    ACCOUNT_WINDOW_MS,
  );
  return accountResult;
};

export const resolveClientIp = (request: Request): string => {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // First IP in the chain is the original client
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headers.get('x-real-ip') ?? '127.0.0.1';
};
