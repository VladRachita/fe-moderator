import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/auth/config';
import { createCodeVerifier, createCodeChallenge, createState } from '@/lib/auth/pkce';
import { sanitizeReturnTo, resolveRedirectUri } from '@/lib/auth/url';
import {
  authorizeUser,
  exchangeAuthorizationCode,
  fetchUserIdentity,
  verifyLoginCode,
  revokeTokensByValue,
  BackendIdentityError,
} from '@/lib/auth/server-client';
import { issueCsrfCookie, setSessionCookies, getAccessTokenValue } from '@/lib/auth/tokens';
import { decodeJwtPayload, mapSessionDetails } from '@/lib/auth/jwt';
import { checkLoginRateLimits, resolveClientIp } from '@/lib/auth/rate-limit';
import { constantTimeEqual } from '@/lib/auth/crypto';

const MAX_IDENTIFIER_LENGTH = 254; // RFC 5321 max email length
const MAX_PASSWORD_LENGTH = 128;
const MAX_RETURN_TO_LENGTH = 2048;
const MAX_BODY_SIZE = 4096; // 4KB — login payload needs ~400 bytes
const MAX_DEVICE_ID_LENGTH = 128;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._+-]+(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?$/;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9._\-:]+$/;
const LOGIN_CODE_PATTERN = /^[A-Za-z0-9]{6,12}$/;
const MAX_LOGIN_CODE_LENGTH = 12;

const parseBody = async (request: NextRequest) => {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_SIZE) {
    return {};
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await request.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }
  if (request.method === 'POST') {
    try {
      return (await request.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const extractString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
};

export const POST = async (request: NextRequest) => {
  const body = await parseBody(request);
  const email = extractString(body.email ?? body.username);
  const password = extractString(body.password);
  const rawDeviceId = extractString(body.deviceId);
  const deviceId =
    rawDeviceId && rawDeviceId.length <= MAX_DEVICE_ID_LENGTH && DEVICE_ID_PATTERN.test(rawDeviceId)
      ? rawDeviceId
      : undefined;
  const rawLoginCode = extractString(body.loginCode);
  const loginCode =
    rawLoginCode && rawLoginCode.length <= MAX_LOGIN_CODE_LENGTH && LOGIN_CODE_PATTERN.test(rawLoginCode)
      ? rawLoginCode
      : undefined;
  if (rawLoginCode && !loginCode) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }
  const returnTo = extractString(body.returnTo);

  if (!email || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  if (
    email.length > MAX_IDENTIFIER_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    (returnTo && returnTo.length > MAX_RETURN_TO_LENGTH)
  ) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  if (!IDENTIFIER_PATTERN.test(email)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const clientIp = resolveClientIp(request);
  const rateLimit = checkLoginRateLimits(clientIp, email);
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  const sanitizedReturnTo = returnTo ? sanitizeReturnTo(returnTo) : undefined;

  const { clientId, scope, redirectUri, appUrl } = getAuthConfig();
  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);
  const state = createState();
  const redirectTarget = resolveRedirectUri(request.url, redirectUri, appUrl);

  const configuredScopes = scope.split(/\s+/).filter(Boolean);

  // Always request all configured scopes to avoid mismatch when backend issues
  // more scopes than requested (e.g., superadmin logging in via /dashboard)
  const scopes = configuredScopes;

  try {
    const authorizeResponse = await authorizeUser({
      username: email,
      password,
      clientId,
      redirectUri: redirectTarget,
      scope: scopes,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      state,
      deviceId,
    });

    if (authorizeResponse.state && !constantTimeEqual(authorizeResponse.state, state)) {
      return NextResponse.json({ error: 'state_mismatch' }, { status: 400 });
    }

    const { data: tokens, setCookies } = await exchangeAuthorizationCode(request, {
      code: authorizeResponse.code,
      codeVerifier: verifier,
      redirectUri: redirectTarget,
    });

    const accessToken = getAccessTokenValue(tokens);
    let identity;
    try {
      identity = await fetchUserIdentity(accessToken);
    } catch (identityError) {
      if (identityError instanceof BackendIdentityError) {
        const code = identityError.status === 403 ? 'authorization_failed' : 'authentication_failed';
        const response = NextResponse.json({ error: code }, { status: identityError.status });
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      console.error('Failed to resolve user identity after login', identityError);
      const response = NextResponse.json({ error: 'authentication_failed' }, { status: 500 });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const payload = decodeJwtPayload(accessToken);
    const sessionDetails = mapSessionDetails(payload, identity);

    const hasAuthorizedView =
      sessionDetails.permissions.canModerate ||
      sessionDetails.permissions.canViewAnalytics ||
      sessionDetails.permissions.canManageUsers ||
      sessionDetails.permissions.canManageBusinesses;
    if (!hasAuthorizedView) {
      const response = NextResponse.json({ error: 'authorization_failed' }, { status: 403 });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    if (identity.loginCodeRequired) {
      const rawRefreshToken = tokens.refreshToken ?? tokens.refresh_token;

      if (!loginCode) {
        if (rawRefreshToken) revokeTokensByValue(rawRefreshToken).catch(() => {});
        const response = NextResponse.json({ error: 'login_code_required' }, { status: 403 });
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      try {
        const codeValid = await verifyLoginCode(accessToken, loginCode);
        if (!codeValid) {
          if (rawRefreshToken) revokeTokensByValue(rawRefreshToken).catch(() => {});
          const response = NextResponse.json({ error: 'invalid_code' }, { status: 401 });
          response.headers.set('Cache-Control', 'no-store');
          return response;
        }
      } catch {
        if (rawRefreshToken) revokeTokensByValue(rawRefreshToken).catch(() => {});
        const response = NextResponse.json({ error: 'verification_failed' }, { status: 502 });
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
    }

    const mustRotatePassword = Boolean(sessionDetails.needsPasswordChange);
    let defaultRedirect = '/dashboard';
    if (mustRotatePassword) {
      defaultRedirect = '/account/password';
    } else if (
      !sessionDetails.permissions.canModerate &&
      sessionDetails.permissions.canViewAnalytics
    ) {
      defaultRedirect = '/analytics';
    } else if (
      !sessionDetails.permissions.canModerate &&
      !sessionDetails.permissions.canViewAnalytics &&
      sessionDetails.permissions.canManageUsers
    ) {
      defaultRedirect = '/super-admin';
    } else if (
      // HOST users (HOSTS-ON-WEB V1) — last branch so platform staff
      // (who never have canManageBusinesses=true) match earlier branches first.
      !sessionDetails.permissions.canModerate &&
      !sessionDetails.permissions.canViewAnalytics &&
      !sessionDetails.permissions.canManageUsers &&
      sessionDetails.permissions.canManageBusinesses
    ) {
      defaultRedirect = '/host';
    }
    const redirectDestination = mustRotatePassword
      ? '/account/password'
      : sanitizedReturnTo ?? defaultRedirect;

    const response = NextResponse.json({
      redirect: redirectDestination,
    });

    setSessionCookies(response, tokens, Date.now());
    issueCsrfCookie(response, randomUUID());
    response.headers.set('Cache-Control', 'no-store');
    setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));

    return response;
  } catch (error) {
    console.error('Login flow failed:', error);
    const response = NextResponse.json({ error: 'authentication_failed' }, { status: 401 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
};

export const runtime = 'nodejs';
