import { describe, it, expect } from 'vitest';
import {
  peekRateLimit,
  recordFailure,
  resetCounter,
  peekLoginRateLimits,
  recordLoginFailure,
  resetLoginAccountCounter,
} from '@/lib/auth/rate-limit';

const uniqueKey = () => `test-${Date.now()}-${Math.random()}`;
const uniqueIp = () => `10.0.0.${Math.floor(Math.random() * 250) + 1}`;
const uniqueEmail = () => `user-${Date.now()}-${Math.random()}@example.com`;

describe('peekRateLimit + recordFailure + resetCounter (core primitives)', () => {
  it('allows requests under the limit', () => {
    const key = uniqueKey();
    const result = peekRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('blocks after exceeding the limit (recordFailure × N)', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      recordFailure(key, 5, 60_000);
    }
    const result = peekRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('counts remaining correctly after recordFailure', () => {
    const key = uniqueKey();
    recordFailure(key, 5, 60_000);
    recordFailure(key, 5, 60_000);
    recordFailure(key, 5, 60_000);
    const result = peekRateLimit(key, 5, 60_000);
    expect(result.remaining).toBe(2);
  });

  it('isolates different keys', () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    for (let i = 0; i < 3; i++) {
      recordFailure(keyA, 3, 60_000);
    }
    expect(peekRateLimit(keyA, 3, 60_000).allowed).toBe(false);
    expect(peekRateLimit(keyB, 3, 60_000).allowed).toBe(true);
  });

  it('allows again after window expires', async () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      recordFailure(key, 3, 10);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    const result = peekRateLimit(key, 3, 10);
    expect(result.allowed).toBe(true);
  });
});

describe('peekRateLimit semantics', () => {
  it('does NOT increment the counter between calls', () => {
    const key = uniqueKey();
    for (let i = 0; i < 100; i++) {
      peekRateLimit(key, 5, 60_000);
    }
    // After 100 peeks, the next peek should still be at count=0, remaining=5
    const result = peekRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('reports the same allowed/blocked state as a subsequent recordFailure would compute', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      recordFailure(key, 5, 60_000);
    }
    const peek = peekRateLimit(key, 5, 60_000);
    expect(peek.allowed).toBe(false);
    expect(peek.remaining).toBe(0);
    expect(peek.retryAfterMs).toBeGreaterThan(0);
  });
});

describe('recordFailure', () => {
  it('pushes a timestamp on every call', () => {
    const key = uniqueKey();
    recordFailure(key, 5, 60_000);
    recordFailure(key, 5, 60_000);
    recordFailure(key, 5, 60_000);
    const peek = peekRateLimit(key, 5, 60_000);
    expect(peek.remaining).toBe(2);
  });

  it('still pushes when already over the limit (cleanup honesty)', () => {
    const key = uniqueKey();
    for (let i = 0; i < 6; i++) {
      recordFailure(key, 5, 60_000);
    }
    const peek = peekRateLimit(key, 5, 60_000);
    expect(peek.allowed).toBe(false);
  });
});

describe('resetCounter', () => {
  it('drops the counter so a 5th peek is allowed again', () => {
    const key = uniqueKey();
    for (let i = 0; i < 4; i++) {
      recordFailure(key, 5, 60_000);
    }
    resetCounter(key);
    const peek = peekRateLimit(key, 5, 60_000);
    expect(peek.allowed).toBe(true);
    expect(peek.remaining).toBe(5);
  });
});

describe('peekLoginRateLimits + recordLoginFailure + resetLoginAccountCounter', () => {
  it('mirrors the backend AuthorizationService.kt 5/5min per-account threshold', () => {
    const ip = uniqueIp();
    const email = uniqueEmail();
    for (let i = 0; i < 4; i++) {
      recordLoginFailure(ip, email);
    }
    expect(peekLoginRateLimits(ip, email).allowed).toBe(true);
    recordLoginFailure(ip, email);
    const peek = peekLoginRateLimits(ip, email);
    expect(peek.allowed).toBe(false);
    expect(peek.retryAfterMs).toBeGreaterThan(0);
    // 5-minute window means retryAfter ≤ 5 minutes
    expect(peek.retryAfterMs).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it('uses a 30 failures / 15min per-IP threshold', () => {
    const ip = uniqueIp();
    // Spread failures across many distinct accounts so per-account never trips
    for (let i = 0; i < 29; i++) {
      recordLoginFailure(ip, `user-${i}-${uniqueEmail()}`);
    }
    const peekAfter29 = peekLoginRateLimits(ip, `user-fresh-${uniqueEmail()}`);
    expect(peekAfter29.allowed).toBe(true);
    recordLoginFailure(ip, `user-30-${uniqueEmail()}`);
    const peekAfter30 = peekLoginRateLimits(ip, `user-fresh2-${uniqueEmail()}`);
    expect(peekAfter30.allowed).toBe(false);
  });

  it('resets the per-account counter on success (resetLoginAccountCounter)', () => {
    const ip = uniqueIp();
    const email = uniqueEmail();
    for (let i = 0; i < 4; i++) {
      recordLoginFailure(ip, email);
    }
    resetLoginAccountCounter(email);
    // After reset, the same email from the same IP should be allowed
    // (per-IP counter still at 4 < 30 so does not gate)
    expect(peekLoginRateLimits(ip, email).allowed).toBe(true);
  });

  it('does NOT distinguish IP vs account in the public return type (no enumeration oracle)', () => {
    const ip = uniqueIp();
    const email = uniqueEmail();
    for (let i = 0; i < 5; i++) {
      recordLoginFailure(ip, email);
    }
    const peek = peekLoginRateLimits(ip, email);
    // RateLimitResult shape pins this: allowed, remaining, retryAfterMs.
    // Adding a scope/account/locked/email field would be detectable here.
    const keys = Object.keys(peek).sort();
    expect(keys).toEqual(['allowed', 'remaining', 'retryAfterMs']);
  });

  it('success-then-concurrent-failure semantic-loss pin (accepted contract)', () => {
    // The peek → await → record window in the login route allows a success
    // path to reset the per-account counter while a concurrent failure path
    // is still in flight. Net result: the prior failures are forgotten and
    // only the concurrent failure remains. This is INTENTIONAL — backend
    // AuthorizationService.kt:85-87 is the authoritative DB-backed lockout.
    // A future "fix" adding a per-email mutex would change this contract
    // and would not change the security envelope; this test makes the
    // accepted contract executable.
    const ip = uniqueIp();
    const email = uniqueEmail();
    for (let i = 0; i < 4; i++) {
      recordLoginFailure(ip, email);
    }
    // Simulate: success completes first, resets the account counter
    resetLoginAccountCounter(email);
    // Then the in-flight failure completes
    recordLoginFailure(ip, email);
    // Result: the 4 prior failures are gone; only the trailing failure
    // remains on the per-account counter
    const peek = peekLoginRateLimits(ip, email);
    expect(peek.allowed).toBe(true);
    expect(peek.remaining).toBe(4); // 5 max - 1 trailing failure
  });

  it('concurrent recordLoginFailure calls for the same key are race-safe under Promise.all', async () => {
    const ip = uniqueIp();
    const email = uniqueEmail();
    // 10 parallel failures; V8 single-thread serialises the synchronous
    // Map writes, so the final count equals the number of calls
    await Promise.all(
      Array.from({ length: 10 }, () => Promise.resolve().then(() => recordLoginFailure(ip, email))),
    );
    const peek = peekLoginRateLimits(ip, email);
    expect(peek.allowed).toBe(false); // 10 ≥ 5 account threshold
  });
});
