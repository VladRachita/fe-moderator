import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens, fetchUserIdentity, BackendIdentityError } from '@/lib/auth/server-client';
import { clearSessionCookies, issueCsrfCookie, setSessionCookies, getAccessTokenValue } from '@/lib/auth/tokens';
import { decodeJwtPayload, mapSessionDetails } from '@/lib/auth/jwt';
import { peekRateLimit, recordFailure, resolveClientIp } from '@/lib/auth/rate-limit';

const REFRESH_MAX_ATTEMPTS = 20;
const REFRESH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Failures-only counting for the refresh gate. Per-IP only — refresh is
// session-bound and we never know the email at request time. Recording is
// synchronous in each failure branch so client-disconnect cannot skip it.
// Successful refreshes do NOT increment the counter (was: previously every
// attempt incremented under the legacy checkRateLimit shim).
const recordRefreshFailure = (clientIp: string) =>
  recordFailure(`refresh:${clientIp}`, REFRESH_MAX_ATTEMPTS, REFRESH_WINDOW_MS);

export const POST = async (request: NextRequest) => {
  const clientIp = resolveClientIp(request);
  const rateLimit = peekRateLimit(`refresh:${clientIp}`, REFRESH_MAX_ATTEMPTS, REFRESH_WINDOW_MS);
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'rate_limit_exceeded', retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  try {
    const result = await refreshTokens(request);
    if (!result) {
      recordRefreshFailure(clientIp);
      const response = NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
      clearSessionCookies(response);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const accessToken = getAccessTokenValue(result.data);
    let identity;
    try {
      identity = await fetchUserIdentity(accessToken);
    } catch (identityError) {
      if (identityError instanceof BackendIdentityError) {
        recordRefreshFailure(clientIp);
        const response = NextResponse.json(
          { error: identityError.status === 403 ? 'forbidden' : 'reauth_required' },
          { status: identityError.status },
        );
        if (identityError.status === 401) {
          clearSessionCookies(response);
        }
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      recordRefreshFailure(clientIp);
      console.error('Failed to fetch user identity after refresh', identityError);
      const response = NextResponse.json({ error: 'refresh_error' }, { status: 500 });
      clearSessionCookies(response);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const payload = decodeJwtPayload(accessToken);
    const sessionDetails = mapSessionDetails(payload, identity);

    const response = NextResponse.json({ ok: true, session: sessionDetails });
    setSessionCookies(response, result.data, Date.now());
    issueCsrfCookie(response, randomUUID());
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('x-session-refreshed', '1');
    result.setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
    return response;
  } catch (error) {
    recordRefreshFailure(clientIp);
    console.error('Refresh token failure:', error);
    const response = NextResponse.json({ error: 'refresh_error' }, { status: 500 });
    clearSessionCookies(response);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
};

export const runtime = 'nodejs';
