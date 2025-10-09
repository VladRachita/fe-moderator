import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/auth/config';
import { createCodeVerifier, createCodeChallenge, createState } from '@/lib/auth/pkce';
import { sanitizeReturnTo, resolveRedirectUri } from '@/lib/auth/url';
import { authorizeUser, exchangeAuthorizationCode } from '@/lib/auth/server-client';
import { issueCsrfCookie, setSessionCookies } from '@/lib/auth/tokens';

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

  if (!email || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  const { clientId, scope, redirectUri, appUrl } = getAuthConfig();
  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);
  const state = createState();
  const redirectTarget = resolveRedirectUri(request.url, redirectUri, appUrl);
  const scopes = scope.split(/\s+/).filter(Boolean);

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

    const response = NextResponse.json({
      redirect: sanitizeReturnTo(returnTo),
    });

    setSessionCookies(response, tokens, Date.now());
    issueCsrfCookie(response, randomUUID());
    response.headers.set('Cache-Control', 'no-store');
    setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));

    return response;
  } catch (error) {
    console.error('Login flow failed:', error);
    return NextResponse.json({ error: 'authentication_failed' }, { status: 401 });
  }
};

export const runtime = 'nodejs';
