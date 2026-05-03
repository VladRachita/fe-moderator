import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  decryptAccessToken,
  setSessionCookies,
  issueCsrfCookie,
  clearSessionCookies,
  getAccessTokenValue,
} from '@/lib/auth/tokens';
import { refreshTokens, fetchUserIdentity, BackendIdentityError } from '@/lib/auth/server-client';
import { COOKIE_NAMES, CSRF_HEADER } from '@/lib/auth/constants';
import { constantTimeEqual } from '@/lib/auth/crypto';

const isSafeMethod = (method: string) => ['GET', 'HEAD', 'OPTIONS'].includes(method);

const BACKEND_BASE_URL = process.env.BACKEND_API_BASE_URL ?? 'http://localhost:8080';

const buildTargetUrl = (request: NextRequest, pathSegments: string[]): string => {
  const trimmedBase = BACKEND_BASE_URL.replace(/\/+$/, '');
  const path = pathSegments.join('/');
  const suffix = path.length > 0 ? `/${path}` : '';
  return `${trimmedBase}${suffix}${request.nextUrl.search}`;
};

const cloneHeaders = (request: NextRequest, accessToken: string): Headers => {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('accept-encoding');
  headers.set('authorization', `Bearer ${accessToken}`);
  headers.set('accept-encoding', 'identity');
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  } else {
    headers.delete('cookie');
  }
  return headers;
};

const forward = async (
  request: NextRequest,
  accessToken: string,
  pathSegments: string[],
  bodyBuffer?: ArrayBuffer,
) => {
  const targetUrl = buildTargetUrl(request, pathSegments);
  const init: RequestInit = {
    method: request.method,
    headers: cloneHeaders(request, accessToken),
    redirect: 'manual',
  };

  if (!isSafeMethod(request.method) && bodyBuffer) {
    init.body = bodyBuffer;
  }

  return fetch(targetUrl, init);
};

const extractSetCookies = (response: Response): string[] => {
  const headersAny = response.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headersAny.getSetCookie === 'function') {
    return headersAny.getSetCookie();
  }
  const header = response.headers.get('set-cookie');
  return header ? [header] : [];
};

const ALLOWED_RESPONSE_HEADERS = new Set<string>([
  'content-type',
  'content-length',
  'content-encoding',
  'cache-control',
  'etag',
  'last-modified',
  'location',
  'vary',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'x-session-refreshed',
]);

const toNextResponse = async (backendResponse: Response) => {
  const headers = new Headers();
  backendResponse.headers.forEach((value, key) => {
    if (ALLOWED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  const body = backendResponse.body ?? null;
  const response = new NextResponse(body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers,
  });
  response.headers.set('Cache-Control', 'no-store');
  extractSetCookies(backendResponse).forEach((cookie) => response.headers.append('set-cookie', cookie));
  return response;
};

const ensureCsrf = (request: NextRequest): NextResponse | null => {
  if (isSafeMethod(request.method)) {
    return null;
  }
  const cookieToken = request.cookies.get(COOKIE_NAMES.csrfToken)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
    return NextResponse.json({ error: 'csrf_validation_failed' }, { status: 403 });
  }

  return null;
};

const proxyHandler = async (request: NextRequest, paramsPromise: Promise<{ path: string[] }>) => {
  const csrfFailure = ensureCsrf(request);
  if (csrfFailure) {
    return csrfFailure;
  }

  const accessToken = decryptAccessToken(request);
  if (!accessToken) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const params = await paramsPromise;
  const bodyBuffer =
    !isSafeMethod(request.method) && request.body ? await request.arrayBuffer() : undefined;

  let backendResponse = await forward(request, accessToken, params.path, bodyBuffer);

  if (backendResponse.status !== 401) {
    if (backendResponse.status === 405) {
      console.error('[proxy] received 405 from backend', request.method, request.url);
    }
    return toNextResponse(backendResponse);
  }

  const refreshedResult = await refreshTokens(request);
  if (!refreshedResult) {
    const response = NextResponse.json({ error: 'session_expired' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const newAccessToken = getAccessTokenValue(refreshedResult.data);
  backendResponse = await forward(request, newAccessToken, params.path, bodyBuffer);

  try {
    await fetchUserIdentity(newAccessToken);
  } catch (identityError) {
    if (identityError instanceof BackendIdentityError) {
      backendResponse.body?.cancel?.();
      const response = NextResponse.json(
        { error: identityError.status === 403 ? 'forbidden' : 'reauth_required' },
        { status: identityError.status, headers: { 'Cache-Control': 'no-store' } },
      );
      if (identityError.status === 401) {
        clearSessionCookies(response);
      }
      return response;
    }
    console.error('Failed to refresh user identity', identityError);
  }

  const response = await toNextResponse(backendResponse);
  setSessionCookies(response, refreshedResult.data, Date.now());
  issueCsrfCookie(response, randomUUID());
  refreshedResult.setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
  response.headers.set('x-session-refreshed', '1');
  return response;
};

export const GET = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
export const POST = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
export const HEAD = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
export const PUT = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
export const PATCH = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
export const DELETE = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
export const OPTIONS = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxyHandler(request, context.params);
