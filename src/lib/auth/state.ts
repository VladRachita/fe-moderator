import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES, COOKIE_MAX_AGE } from './constants';
import { encrypt, decrypt, signValue, constantTimeEqual } from './crypto';
import { getAuthConfig } from './config';

const ephemeralCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE.oauthTransient,
};

export const persistPkceVerifier = (response: NextResponse, verifier: string) => {
  const { cookieSecret } = getAuthConfig();
  response.cookies.set({
    name: COOKIE_NAMES.pkceVerifier,
    value: encrypt(verifier, cookieSecret),
    ...ephemeralCookieOptions,
  });
};

export const readPkceVerifier = (request: NextRequest): string | null => {
  const cookieValue = request.cookies.get(COOKIE_NAMES.pkceVerifier)?.value;
  if (!cookieValue) {
    return null;
  }
  const { cookieSecret } = getAuthConfig();
  try {
    return decrypt(cookieValue, cookieSecret);
  } catch {
    return null;
  }
};

export const persistState = (response: NextResponse, state: string) => {
  const { cookieSecret } = getAuthConfig();
  const signature = signValue(state, cookieSecret);
  response.cookies.set({
    name: COOKIE_NAMES.oauthState,
    value: signature,
    ...ephemeralCookieOptions,
  });
};

export const validateState = (request: NextRequest, state: string | null): boolean => {
  if (!state) {
    return false;
  }
  const { cookieSecret } = getAuthConfig();
  const expectedSignature = request.cookies.get(COOKIE_NAMES.oauthState)?.value;
  if (!expectedSignature) {
    return false;
  }
  const presented = signValue(state, cookieSecret);
  return constantTimeEqual(expectedSignature, presented);
};

export const persistReturnTo = (response: NextResponse, value: string) => {
  response.cookies.set({
    name: COOKIE_NAMES.returnTo,
    value,
    ...ephemeralCookieOptions,
  });
};

export const readReturnTo = (request: NextRequest): string | null => {
  return request.cookies.get(COOKIE_NAMES.returnTo)?.value ?? null;
};

export const clearEphemeral = (response: NextResponse) => {
  response.cookies.delete(COOKIE_NAMES.pkceVerifier);
  response.cookies.delete(COOKIE_NAMES.oauthState);
  response.cookies.delete(COOKIE_NAMES.returnTo);
};
