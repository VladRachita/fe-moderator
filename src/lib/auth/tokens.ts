import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_REFRESH_COOKIE, COOKIE_MAX_AGE, COOKIE_NAMES } from './constants';
import { encrypt, decrypt } from './crypto';
import { getAuthConfig } from './config';

const isProduction = process.env.NODE_ENV === 'production';

export interface TokenResponse {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  expiresIn?: number;
  expires_in?: number;
  refreshTokenExpiresIn?: number;
  refresh_expires_in?: number;
  tokenType?: string;
  token_type?: string;
  scope?: string;
}

const cookieBaseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  path: '/',
};

export const csrfCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'strict' as const,
  path: '/',
};

export interface SessionMeta {
  lastActive: number;
  absoluteExpiry: number;
}

export const getAccessTokenValue = (tokens: TokenResponse): string => {
  const accessToken = tokens.accessToken ?? tokens.access_token;
  if (!accessToken) {
    throw new Error('Token payload missing access token');
  }
  return accessToken;
};

const resolveAccessExpiry = (tokens: TokenResponse): number => {
  return tokens.expiresIn ?? tokens.expires_in ?? COOKIE_MAX_AGE.accessToken;
};

const resolveRefreshExpiry = (tokens: TokenResponse): number => {
  return tokens.refreshTokenExpiresIn ?? tokens.refresh_expires_in ?? COOKIE_MAX_AGE.refreshToken;
};

export const getSessionMeta = (request: NextRequest): SessionMeta | null => {
  try {
    const encrypted = request.cookies.get(COOKIE_NAMES.sessionMeta)?.value;
    if (!encrypted) {
      return null;
    }
    const { cookieSecret } = getAuthConfig();
    const decoded = decrypt(encrypted, cookieSecret);
    return JSON.parse(decoded) as SessionMeta;
  } catch {
    return null;
  }
};

export const setSessionCookies = (
  response: NextResponse,
  tokens: TokenResponse,
  issuedAt: number,
) => {
  const { cookieSecret } = getAuthConfig();
  const accessToken = getAccessTokenValue(tokens);
  const accessPayload = encrypt(accessToken, cookieSecret);

  response.cookies.set({
    name: COOKIE_NAMES.accessToken,
    value: accessPayload,
    maxAge: resolveAccessExpiry(tokens),
    ...cookieBaseOptions,
  });

  const sessionMeta: SessionMeta = {
    lastActive: issuedAt,
    absoluteExpiry: issuedAt + resolveRefreshExpiry(tokens) * 1000,
  };

  response.cookies.set({
    name: COOKIE_NAMES.sessionMeta,
    value: encrypt(JSON.stringify(sessionMeta), cookieSecret),
    maxAge: resolveRefreshExpiry(tokens),
    ...cookieBaseOptions,
  });
};

export const clearSessionCookies = (response: NextResponse) => {
  response.cookies.delete(COOKIE_NAMES.accessToken);
  response.cookies.delete(COOKIE_NAMES.sessionMeta);
  response.cookies.delete(COOKIE_NAMES.csrfToken);
  response.cookies.set({
    name: BACKEND_REFRESH_COOKIE,
    value: '',
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
};

export const issueCsrfCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: COOKIE_NAMES.csrfToken,
    value: token,
    maxAge: COOKIE_MAX_AGE.csrfToken,
    ...csrfCookieOptions,
  });
};

export const decryptAccessToken = (request: NextRequest): string | null => {
  const encryptedToken = request.cookies.get(COOKIE_NAMES.accessToken)?.value;
  if (!encryptedToken) {
    return null;
  }
  const { cookieSecret } = getAuthConfig();
  try {
    return decrypt(encryptedToken, cookieSecret);
  } catch {
    return null;
  }
};

export const getBackendRefreshToken = (request: NextRequest): string | null => {
  const token = request.cookies.get(BACKEND_REFRESH_COOKIE)?.value;
  if (token) {
    return token;
  }
  return null;
};
