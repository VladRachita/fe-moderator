import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/auth/config';
import { exchangeAuthorizationCode } from '@/lib/auth/server-client';
import {
  readPkceVerifier,
  validateState,
  readReturnTo,
  clearEphemeral,
} from '@/lib/auth/state';
import { setSessionCookies, issueCsrfCookie } from '@/lib/auth/tokens';
import { sanitizeReturnTo, resolveRedirectUri } from '@/lib/auth/url';
import { COOKIE_NAMES } from '@/lib/auth/constants';

const buildErrorRedirect = (request: NextRequest, reason: string) => {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(COOKIE_NAMES.pkceVerifier);
  response.cookies.delete(COOKIE_NAMES.oauthState);
  response.cookies.delete(COOKIE_NAMES.returnTo);
  response.cookies.delete(COOKIE_NAMES.accessToken);
  response.cookies.delete(COOKIE_NAMES.refreshToken);
  response.cookies.delete(COOKIE_NAMES.sessionMeta);
  response.cookies.delete(COOKIE_NAMES.csrfToken);
  return response;
};

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return buildErrorRedirect(request, 'missing_code');
  }

  if (!validateState(request, state)) {
    return buildErrorRedirect(request, 'invalid_state');
  }

  const codeVerifier = readPkceVerifier(request);
  if (!codeVerifier) {
    return buildErrorRedirect(request, 'missing_verifier');
  }

  const { redirectUri, appUrl } = getAuthConfig();
  const redirectTarget = resolveRedirectUri(request.url, redirectUri, appUrl);

  try {
    const { data: tokens, setCookies } = await exchangeAuthorizationCode(request, {
      code,
      codeVerifier,
      redirectUri: redirectTarget,
    });
    const csrfToken = randomUUID();
    const issuedAt = Date.now();
    const safeReturnTo = sanitizeReturnTo(readReturnTo(request));

    const response = NextResponse.redirect(new URL(safeReturnTo, request.url).toString());
    setSessionCookies(response, tokens, issuedAt);
    issueCsrfCookie(response, csrfToken);
    clearEphemeral(response);
    response.headers.set('Cache-Control', 'no-store');
    setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
    return response;
  } catch (error) {
    console.error('OAuth callback failure:', error);
    return buildErrorRedirect(request, 'token_exchange_failed');
  }
};
