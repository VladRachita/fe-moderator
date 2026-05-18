import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock backend HTTP calls — the integration test exercises the route handler
// end-to-end at the request/response boundary, but the real backend is out
// of scope. The mock surface mirrors the actual server-client.ts exports.
vi.mock('@/lib/auth/server-client', () => {
  class BackendIdentityError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'BackendIdentityError';
    }
  }
  return {
    authorizeUser: vi.fn(),
    exchangeAuthorizationCode: vi.fn(),
    fetchUserIdentity: vi.fn(),
    verifyLoginCode: vi.fn().mockResolvedValue(true),
    revokeTokensByValue: vi.fn().mockResolvedValue(undefined),
    BackendIdentityError,
  };
});

// Pin config so cookie encryption has a deterministic key and scopes are valid.
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
import { peekLoginRateLimits } from '@/lib/auth/rate-limit';

// Build a real-shaped JWT with the given payload. `decodeJwtPayload` only
// base64-decodes the middle segment, so the header/signature can be opaque.
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

const buildRequest = (email: string, password = 'password', ip = '10.0.0.1') =>
  new NextRequest('https://example.com/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ email, password }),
  });

// Use a per-test unique IP + email so the in-memory rate-limit Map does not
// bleed state across cases.
const uniqueIp = () => `10.0.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;

const wireSuccessfulBackend = () => {
  vi.mocked(serverClient.authorizeUser).mockResolvedValue({
    code: 'auth-code-xyz',
    state: undefined,
  } as Awaited<ReturnType<typeof serverClient.authorizeUser>>);
  vi.mocked(serverClient.exchangeAuthorizationCode).mockResolvedValue({
    data: {
      accessToken: moderatorAccessToken(),
      refreshToken: 'refresh-xyz',
      expiresIn: 600,
      refresh_expires_in: 604_800,
    },
    setCookies: [],
  } as Awaited<ReturnType<typeof serverClient.exchangeAuthorizationCode>>);
};

const wireIdentity = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(serverClient.fetchUserIdentity).mockResolvedValue({
    authenticated: true,
    userId: 'user-id-1',
    clientId: 'test-client',
    loginCodeRequired: false,
    ...overrides,
  } as Awaited<ReturnType<typeof serverClient.fetchUserIdentity>>);
};

describe('/api/auth/login (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successful login resets the per-account counter', async () => {
    const ip = uniqueIp();
    const email = uniqueEmail('success');
    wireSuccessfulBackend();
    wireIdentity();

    const res = await POST(buildRequest(email, 'password', ip));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redirect).toBe('/dashboard');

    // Per-account counter is at 0 after success (reset on success path).
    const peek = peekLoginRateLimits(ip, email);
    expect(peek.allowed).toBe(true);
    expect(peek.remaining).toBe(5);
  });

  it('wrong password increments the per-account counter', async () => {
    const ip = uniqueIp();
    const email = uniqueEmail('wrong');
    vi.mocked(serverClient.authorizeUser).mockRejectedValue(
      new Error('Invalid credentials'),
    );

    const res = await POST(buildRequest(email, 'wrong', ip));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('authentication_failed');

    // Per-account counter at 1 after one failure.
    const peek = peekLoginRateLimits(ip, email);
    expect(peek.allowed).toBe(true);
    expect(peek.remaining).toBe(4);
  });

  it('login_code_required does NOT increment the per-account counter', async () => {
    const ip = uniqueIp();
    const email = uniqueEmail('code');
    wireSuccessfulBackend();
    wireIdentity({ loginCodeRequired: true });

    const res = await POST(buildRequest(email, 'password', ip));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('login_code_required');

    // Counter unchanged — this branch is NOT a credential failure.
    const peek = peekLoginRateLimits(ip, email);
    expect(peek.allowed).toBe(true);
    expect(peek.remaining).toBe(5);
  });

  it('hitting the per-account limit returns 429 with retryAfterSeconds and no scope/account leak', async () => {
    const ip = uniqueIp();
    const email = uniqueEmail('lockout');
    vi.mocked(serverClient.authorizeUser).mockRejectedValue(
      new Error('Invalid credentials'),
    );

    // 5 wrong-password attempts trip the per-account gate.
    for (let i = 0; i < 5; i++) {
      const res = await POST(buildRequest(email, 'wrong', ip));
      expect(res.status).toBe(401);
    }

    // 6th attempt: 429 with precise retryAfterSeconds, generic body.
    const res = await POST(buildRequest(email, 'wrong', ip));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();

    const body = await res.json();
    expect(body.error).toBe('rate_limit_exceeded');
    expect(typeof body.retryAfterSeconds).toBe('number');
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(5 * 60);

    // Email-enumeration oracle contract: body MUST NOT carry scope / account /
    // locked / email fields that would let an attacker enumerate valid accounts.
    const keys = Object.keys(body).sort();
    expect(keys).toEqual(['error', 'retryAfterSeconds']);
  });

  it('successful login after partial failures resets, allowing a fresh 5-attempt window', async () => {
    const ip = uniqueIp();
    const email = uniqueEmail('partial');

    // 3 failed attempts
    vi.mocked(serverClient.authorizeUser).mockRejectedValue(
      new Error('Invalid credentials'),
    );
    for (let i = 0; i < 3; i++) {
      await POST(buildRequest(email, 'wrong', ip));
    }
    expect(peekLoginRateLimits(ip, email).remaining).toBe(2);

    // Successful attempt
    vi.mocked(serverClient.authorizeUser).mockReset();
    wireSuccessfulBackend();
    wireIdentity();
    const successRes = await POST(buildRequest(email, 'password', ip));
    expect(successRes.status).toBe(200);

    // Counter reset — fresh 5 attempts available.
    expect(peekLoginRateLimits(ip, email).remaining).toBe(5);
  });
});
