/**
 * In-memory sliding-window rate limiter.
 *
 * Best-effort BFF lockout. The Map is per-process; it resets on container
 * restart and is sharded per replica. Backend AuthorizationService
 * (videoSanity AuthorizationService.kt:85-87) owns the authoritative
 * DB-backed lockout (5 failures / 5 min, persisted to user_security
 * .failed_attempts + locked_until). The BFF gate here exists to surface a
 * precise UX message and to shed obvious abuse before it reaches the backend;
 * it is NOT a security boundary. Do NOT add a per-email mutex here — it would
 * not change the security envelope and would halve login throughput per
 * account under contention.
 *
 * For durable limiting across replicas, swap to Upstash + @upstash/ratelimit.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Failures-only thresholds for the login flow.
// Per-IP: 30 failures / 15 min — high enough for shared NAT offices, low
// enough to catch obvious credential-stuffing scanners.
// Per-account: 5 failures / 5 min — mirrors backend AuthorizationService.kt
// MAX_FAILED_ATTEMPTS=5 and LOCKOUT_DURATION=Duration.ofMinutes(5) so the BFF
// UX message can quote the wait time precisely without drifting from backend.
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_FAILURES = 30;
const ACCOUNT_WINDOW_MS = 5 * 60 * 1000;
const ACCOUNT_MAX_FAILURES = 5;
const MAX_WINDOW_MS = Math.max(IP_WINDOW_MS, ACCOUNT_WINDOW_MS);

let lastCleanup = Date.now();

const cleanup = () => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;
  const cutoff = now - MAX_WINDOW_MS;
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

const buildResult = (
  entry: RateLimitEntry,
  now: number,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult => {
  if (entry.timestamps.length >= maxAttempts) {
    const oldestInWindow = entry.timestamps[0] ?? now;
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }
  return {
    allowed: true,
    remaining: maxAttempts - entry.timestamps.length,
    retryAfterMs: 0,
  };
};

const getOrCreateTrimmedEntry = (key: string, windowMs: number, now: number): RateLimitEntry => {
  cleanup();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
  return entry;
};

/**
 * Read-only check — returns the result for the current state without
 * pushing a timestamp. Use this to peek the gate before performing work
 * that may or may not result in a recorded failure.
 */
export const peekRateLimit = (
  identifier: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult => {
  const now = Date.now();
  const entry = getOrCreateTrimmedEntry(identifier, windowMs, now);
  return buildResult(entry, now, maxAttempts, windowMs);
};

/**
 * Push a failure timestamp. Always pushes regardless of whether the gate is
 * already over the limit (keeps cleanup honest and the oldest-in-window math
 * accurate). NOTE: BFF lockout is best-effort. The success path resets the
 * per-account counter via resetCounter(), which may forget pre-success
 * failures during concurrent traffic. This is intentional — backend
 * AuthorizationService (DB-backed, 5/5min) is the authoritative lockout.
 */
export const recordFailure = (
  identifier: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult => {
  const now = Date.now();
  const entry = getOrCreateTrimmedEntry(identifier, windowMs, now);
  entry.timestamps.push(now);
  return buildResult(entry, now, maxAttempts, windowMs);
};

/**
 * Drop the counter entirely for a key. Called on the success path. NOTE: BFF
 * lockout is best-effort (see recordFailure doc). Backend remains
 * authoritative.
 */
export const resetCounter = (identifier: string): void => {
  store.delete(identifier);
};

/**
 * Peek both gates without recording. Returns the failing result if either is
 * exceeded; the IP gate is checked first. Does NOT distinguish which gate
 * tripped in the public API surface — the route handler returns a generic
 * 429 body that does not reveal scope, closing the email-enumeration oracle.
 */
export const peekLoginRateLimits = (
  clientIp: string,
  identifier: string,
): RateLimitResult => {
  const ipResult = peekRateLimit(`login:${clientIp}`, IP_MAX_FAILURES, IP_WINDOW_MS);
  if (!ipResult.allowed) {
    return ipResult;
  }
  return peekRateLimit(
    `login-account:${identifier.toLowerCase()}`,
    ACCOUNT_MAX_FAILURES,
    ACCOUNT_WINDOW_MS,
  );
};

/**
 * Record a failure against BOTH the per-IP and per-account counters. Call
 * from the login route's catch block after authorizeUser rejects (i.e.
 * exactly the wrong-password path). Synchronous: writes to in-memory Map and
 * does NOT await — the counter increments even if the upstream client has
 * disconnected mid-request, because Next.js continues running the handler
 * to completion on client abort unless request.signal is checked.
 */
export const recordLoginFailure = (clientIp: string, identifier: string): void => {
  recordFailure(`login:${clientIp}`, IP_MAX_FAILURES, IP_WINDOW_MS);
  recordFailure(
    `login-account:${identifier.toLowerCase()}`,
    ACCOUNT_MAX_FAILURES,
    ACCOUNT_WINDOW_MS,
  );
};

/**
 * Drop the per-account counter on a successful login. We do NOT reset the
 * per-IP counter — a single legitimate success from a shared NAT must not
 * wipe failures accumulated by other tenants on the same egress IP, since
 * those failures are the credential-stuffing signal the per-IP gate exists
 * to capture.
 */
export const resetLoginAccountCounter = (identifier: string): void => {
  resetCounter(`login-account:${identifier.toLowerCase()}`);
};

export const resolveClientIp = (request: Request): string => {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Last IP is the one appended by the trusted reverse proxy (Vercel/Cloudflare/nginx)
    // — the client cannot spoof this position since proxies append, not prepend
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    const clientIp = parts[parts.length - 1];
    if (clientIp) {
      return clientIp;
    }
  }
  return headers.get('x-real-ip') ?? '127.0.0.1';
};
