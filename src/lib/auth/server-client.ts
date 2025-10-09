import { NextRequest } from 'next/server';
import { getAuthConfig } from './config';
import { TokenResponse, getBackendRefreshToken } from './tokens';

interface AuthorizeResponse {
  code: string;
  state?: string;
}

interface BackendCallResult<T> {
  data: T;
  setCookies: string[];
}

const extractSetCookies = (response: Response): string[] => {
  const headersAny = response.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headersAny.getSetCookie === 'function') {
    return headersAny.getSetCookie();
  }
  const header = response.headers.get('set-cookie');
  return header ? [header] : [];
};

const forwardCookies = (request: NextRequest): string | undefined => {
  const cookieHeader = request.headers.get('cookie');
  return cookieHeader && cookieHeader.length > 0 ? cookieHeader : undefined;
};

export const authorizeUser = async (
  body: {
    username: string;
    password: string;
    scope: string[];
    codeChallenge: string;
    codeChallengeMethod: 'S256';
    state: string;
    redirectUri: string;
    clientId: string;
    deviceId?: string;
  },
): Promise<AuthorizeResponse> => {
  const { authorizationEndpoint } = getAuthConfig();
  console.log(
    '[auth] authorize payload',
    JSON.stringify({
      clientId: body.clientId,
      scope: body.scope,
      redirectUri: body.redirectUri,
      hasDeviceId: Boolean(body.deviceId),
    }),
  );
  const response = await fetch(authorizationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error('[auth] authorize response', response.status, message);
    throw new Error(`Authorization request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as AuthorizeResponse;
};

export const exchangeAuthorizationCode = async (
  request: NextRequest,
  payload: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  },
): Promise<BackendCallResult<TokenResponse>> => {
  const { tokenEndpoint, clientId } = getAuthConfig();
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(forwardCookies(request) ? { cookie: forwardCookies(request)! } : {}),
    },
    body: JSON.stringify({
      grantType: 'authorization_code',
      code: payload.code,
      codeVerifier: payload.codeVerifier,
      clientId,
      redirectUri: payload.redirectUri,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${message}`);
  }

  const setCookies = extractSetCookies(response);
  const data = (await response.json()) as TokenResponse;
  return { data, setCookies };
};

export const refreshTokens = async (
  request: NextRequest,
): Promise<BackendCallResult<TokenResponse> | null> => {
  const refreshToken = getBackendRefreshToken(request);
  if (!refreshToken) {
    return null;
  }

  const { tokenEndpoint, clientId } = getAuthConfig();
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(forwardCookies(request) ? { cookie: forwardCookies(request)! } : {}),
    },
    body: JSON.stringify({
      grantType: 'refresh_token',
      refreshToken,
      clientId,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const setCookies = extractSetCookies(response);
  const data = (await response.json()) as TokenResponse;
  return { data, setCookies };
};

export const revokeTokens = async (request: NextRequest): Promise<string[]> => {
  const refreshToken = getBackendRefreshToken(request);
  if (!refreshToken) {
    return [];
  }
  const { revocationEndpoint, clientId } = getAuthConfig();
  const response = await fetch(revocationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(forwardCookies(request) ? { cookie: forwardCookies(request)! } : {}),
    },
    body: JSON.stringify({
      refreshToken,
      clientId,
    }),
  });
  return extractSetCookies(response);
};
