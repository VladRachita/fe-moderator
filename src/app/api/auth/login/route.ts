import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/auth/config';
import { createCodeVerifier, createCodeChallenge, createState } from '@/lib/auth/pkce';
import { sanitizeReturnTo, resolveRedirectUri } from '@/lib/auth/url';
import {
  authorizeUser,
  exchangeAuthorizationCode,
  fetchUserIdentity,
  BackendIdentityError,
} from '@/lib/auth/server-client';
import { issueCsrfCookie, setSessionCookies, getAccessTokenValue } from '@/lib/auth/tokens';
import { decodeJwtPayload, mapSessionDetails } from '@/lib/auth/jwt';

const parseBody = async (request: NextRequest) => {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, unknown>;
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
  const deviceId = extractString(body.deviceId);
  const returnTo = extractString(body.returnTo);
  const sanitizedReturnTo = returnTo ? sanitizeReturnTo(returnTo) : undefined;

  if (!email || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  const { clientId, scope, redirectUri, appUrl } = getAuthConfig();
  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);
  const state = createState();
  const redirectTarget = resolveRedirectUri(request.url, redirectUri, appUrl);

  const configuredScopes = scope.split(/\s+/).filter(Boolean);
  const deriveScopesForTarget = (scopesList: string[], target?: string): string[] => {
    if (!target) {
      const unique = new Set<string>([
        ...scopesList.filter((item) => !item.includes(':')),
        ...scopesList.filter((item) => item.startsWith('moderation:')),
        ...scopesList.filter((item) => item.startsWith('analytics:')),
      ]);
      return Array.from(unique);
    }
    const baseScopes = scopesList.filter((item) => !item.includes(':'));
    const analyticsScopes = scopesList.filter((item) => item.startsWith('analytics:'));
    const moderationScopes = scopesList.filter((item) => item.startsWith('moderation:'));
    const adminScopes = scopesList.filter((item) => item.startsWith('admin:'));

    if (target.startsWith('/analytics')) {
      const unique = new Set<string>([...baseScopes, ...analyticsScopes]);
      return Array.from(unique);
    }

    if (target.startsWith('/dashboard')) {
      const unique = new Set<string>([
        ...baseScopes,
        ...moderationScopes,
        ...analyticsScopes,
      ]);
      return Array.from(unique);
    }

    if (target.startsWith('/super-admin') || target.startsWith('/admin')) {
      const unique = new Set<string>([
        ...baseScopes,
        ...adminScopes,
        ...moderationScopes,
        ...analyticsScopes,
      ]);
      return Array.from(unique);
    }

    const unique = new Set<string>([
      ...baseScopes,
      ...moderationScopes,
      ...analyticsScopes,
    ]);
    return Array.from(unique);
  };

  const scopes = deriveScopesForTarget(configuredScopes, sanitizedReturnTo);

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

    if (authorizeResponse.state && authorizeResponse.state !== state) {
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
      sessionDetails.permissions.canManageUsers;
    if (!hasAuthorizedView) {
      const response = NextResponse.json({ error: 'authorization_failed' }, { status: 403 });
      response.headers.set('Cache-Control', 'no-store');
      return response;
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
