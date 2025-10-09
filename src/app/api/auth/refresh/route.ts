import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens } from '@/lib/auth/server-client';
import { clearSessionCookies, issueCsrfCookie, setSessionCookies } from '@/lib/auth/tokens';

export const POST = async (request: NextRequest) => {
  try {
    const result = await refreshTokens(request);
    if (!result) {
      const response = NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({ ok: true });
    setSessionCookies(response, result.data, Date.now());
    issueCsrfCookie(response, randomUUID());
    response.headers.set('Cache-Control', 'no-store');
    result.setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
    return response;
  } catch (error) {
    console.error('Refresh token failure:', error);
    const response = NextResponse.json({ error: 'refresh_error' }, { status: 500 });
    clearSessionCookies(response);
    return response;
  }
};

export const runtime = 'nodejs';
