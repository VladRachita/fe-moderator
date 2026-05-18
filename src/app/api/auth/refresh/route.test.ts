import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock backend HTTP calls. The route's refresh-token cookie is read by
// `refreshTokens(request)` internally — since that is mocked, we do not
// need to set the cookie on the test request.
vi.mock('@/lib/auth/server-client', () => {
  class BackendIdentityError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'BackendIdentityError';
    }
  }
  return {
    refreshTokens: vi.fn(),
    fetchUserIdentity: vi.fn(),
    BackendIdentityError,
  };
});

// Pin config so cookie encryption (on the success path) has a deterministic
// key and scope derivation produces a known permission set.
vi.mock('@/lib/auth/config', () => ({
  getAuthConfig: () => ({
    clientId: 'test-client',
    scope:
      'moderation:read moderation:write analytics:read admin:users:read admin:users:write app.host',
    cookieSecret: 'test-cookie-secret-32-chars-long-for-aes!',
    redirectUri: 'https://example.com/api/auth/callback',
    appUrl: undefined,
  }),
}));

// Imports AFTER mocks so the route handler picks up the doubles.
import * as serverClient from '@/lib/auth/server-client';
import { POST } from './route';
import { peekRateLimit } from '@/lib/auth/rate-limit';

const REFRESH_MAX_ATTEMPTS = 20;
const REFRESH_WINDOW_MS = 15 * 60 * 1000;

const peekRefreshGate = (ip: string) =>
  peekRateLimit(`refresh:${ip}`, REFRESH_MAX_ATTEMPTS, REFRESH_WINDOW_MS);

// Build a real-shaped JWT. `decodeJwtPayload` only base64-decodes the middle
// segment, so the header/signature can be opaque.
const buildJwt = (payload: Record<string, unknown>): string => {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.fake-signature`;
};

const futureExp = () => Math.floor(Date.now() / 1000) + 3600;

const moderatorAccessToken = () =>
  buildJwt({
    sub: 'user-id-1',
    scope: 'moderation:read moderation:write',
    exp: futureExp(),
  });

const buildRequest = (ip: string) =>
  new NextRequest('https://example.com/api/auth/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
  });

const uniqueIp = () =>
  `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;

const wireSuccessfulBackend = () => {
  vi.mocked(serverClient.refreshTokens).mockResolvedValue({
    data: {
      accessToken: moderatorAccessToken(),
      refreshToken: 'refresh-xyz',
      expiresIn: 600,
      refresh_expires_in: 604_800,
    },
    setCookies: [],
  } as Awaited<ReturnType<typeof serverClient.refreshTokens>>);
  vi.mocked(serverClient.fetchUserIdentity).mockResolvedValue({
    authenticated: true,
    userId: 'user-id-1',
    clientId: 'test-client',
  } as Awaited<ReturnType<typeof serverClient.fetchUserIdentity>>);
};

describe('/api/auth/refresh (integration) — 5 failure branches each call recordRefreshFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Branch 1 (line 33): refreshTokens returns null → 401 refresh_failed
  it('branch 1: refreshTokens returns null → 401 refresh_failed + counter increments', async () => {
    const ip = uniqueIp();
    vi.mocked(serverClient.refreshTokens).mockResolvedValue(null);

    const remainingBefore = peekRefreshGate(ip).remaining;
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('refresh_failed');

    const remainingAfter = peekRefreshGate(ip).remaining;
    expect(remainingAfter).toBe(remainingBefore - 1);
  });

  // Branch 2a (line 46, status === 401): BackendIdentityError 401 → reauth_required
  it('branch 2a: fetchUserIdentity throws BackendIdentityError(401) → 401 reauth_required + counter increments', async () => {
    const ip = uniqueIp();
    vi.mocked(serverClient.refreshTokens).mockResolvedValue({
      data: { accessToken: moderatorAccessToken(), refreshToken: 'r', expiresIn: 600 },
      setCookies: [],
    } as Awaited<ReturnType<typeof serverClient.refreshTokens>>);
    vi.mocked(serverClient.fetchUserIdentity).mockRejectedValue(
      new serverClient.BackendIdentityError(401, 'session expired'),
    );

    const remainingBefore = peekRefreshGate(ip).remaining;
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('reauth_required');

    const remainingAfter = peekRefreshGate(ip).remaining;
    expect(remainingAfter).toBe(remainingBefore - 1);
  });

  // Branch 2b (line 46, status === 403): BackendIdentityError 403 → forbidden
  it('branch 2b: fetchUserIdentity throws BackendIdentityError(403) → 403 forbidden + counter increments', async () => {
    const ip = uniqueIp();
    vi.mocked(serverClient.refreshTokens).mockResolvedValue({
      data: { accessToken: moderatorAccessToken(), refreshToken: 'r', expiresIn: 600 },
      setCookies: [],
    } as Awaited<ReturnType<typeof serverClient.refreshTokens>>);
    vi.mocked(serverClient.fetchUserIdentity).mockRejectedValue(
      new serverClient.BackendIdentityError(403, 'insufficient scope'),
    );

    const remainingBefore = peekRefreshGate(ip).remaining;
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');

    const remainingAfter = peekRefreshGate(ip).remaining;
    expect(remainingAfter).toBe(remainingBefore - 1);
  });

  // Branch 3 (line 57): non-BackendIdentityError from fetchUserIdentity → 500 refresh_error
  it('branch 3: fetchUserIdentity throws generic Error → 500 refresh_error + counter increments', async () => {
    const ip = uniqueIp();
    vi.mocked(serverClient.refreshTokens).mockResolvedValue({
      data: { accessToken: moderatorAccessToken(), refreshToken: 'r', expiresIn: 600 },
      setCookies: [],
    } as Awaited<ReturnType<typeof serverClient.refreshTokens>>);
    // Silence the console.error inside the route for this branch
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(serverClient.fetchUserIdentity).mockRejectedValue(
      new Error('network down'),
    );

    const remainingBefore = peekRefreshGate(ip).remaining;
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('refresh_error');

    const remainingAfter = peekRefreshGate(ip).remaining;
    expect(remainingAfter).toBe(remainingBefore - 1);
    errSpy.mockRestore();
  });

  // Branch 4 (line 76): outer catch — refreshTokens itself throws → 500 refresh_error
  it('branch 4: refreshTokens throws (outer catch) → 500 refresh_error + counter increments', async () => {
    const ip = uniqueIp();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(serverClient.refreshTokens).mockRejectedValue(new Error('backend down'));

    const remainingBefore = peekRefreshGate(ip).remaining;
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('refresh_error');

    const remainingAfter = peekRefreshGate(ip).remaining;
    expect(remainingAfter).toBe(remainingBefore - 1);
    errSpy.mockRestore();
  });

  // SUCCESS path (line 68-74): does NOT call recordRefreshFailure
  it('success path → 200 + counter unchanged (no recordRefreshFailure)', async () => {
    const ip = uniqueIp();
    wireSuccessfulBackend();

    const remainingBefore = peekRefreshGate(ip).remaining;
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.session).toBeDefined();
    expect(body.session.permissions.canModerate).toBe(true);

    const remainingAfter = peekRefreshGate(ip).remaining;
    expect(remainingAfter).toBe(remainingBefore);
  });

  // 429 already-locked-out path (line 22-27): does NOT double-record
  it('once locked at 20 failures, 21st returns 429 and does NOT double-record', async () => {
    const ip = uniqueIp();
    vi.mocked(serverClient.refreshTokens).mockResolvedValue(null);

    // 20 failures trip the gate
    for (let i = 0; i < REFRESH_MAX_ATTEMPTS; i++) {
      const res = await POST(buildRequest(ip));
      expect(res.status).toBe(401);
    }
    const peekAtLockout = peekRefreshGate(ip);
    expect(peekAtLockout.allowed).toBe(false);

    // 21st: 429 with retryAfterSeconds, no scope leak
    const res = await POST(buildRequest(ip));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const body = await res.json();
    expect(body.error).toBe('rate_limit_exceeded');
    expect(typeof body.retryAfterSeconds).toBe('number');
    // 429 path correctly skips recordRefreshFailure (would double-count its
    // own gate trip). Body shape pin — must NOT carry scope/account/locked.
    const keys = Object.keys(body).sort();
    expect(keys).toEqual(['error', 'retryAfterSeconds']);

    // Additionally pin: the 429 path does NOT extend the lockout window. A
    // future refactor that moved recordRefreshFailure outside the catch (or
    // duplicated it in the 429 short-circuit) would push a fresh timestamp
    // into the sliding-window oldest slot, extending retryAfterMs by ~ the
    // gap since the 20th failure. retryAfterMs is computed off the OLDEST
    // in-window timestamp; if it grows after the 429, we have a regression.
    const peekAfter429 = peekRefreshGate(ip);
    expect(peekAfter429.allowed).toBe(false);
    // retryAfterMs should not have grown beyond a tiny scheduling slack
    // (real-world delta is sub-millisecond on a warm V8; allow 50 ms).
    expect(peekAfter429.retryAfterMs).toBeLessThanOrEqual(peekAtLockout.retryAfterMs + 50);
  });
});
