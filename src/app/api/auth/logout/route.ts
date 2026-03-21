import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth/tokens';
import { revokeTokens } from '@/lib/auth/server-client';
import { COOKIE_NAMES, CSRF_HEADER } from '@/lib/auth/constants';
import { constantTimeEqual } from '@/lib/auth/crypto';

export const POST = async (request: NextRequest) => {
  const cookieToken = request.cookies.get(COOKIE_NAMES.csrfToken)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
    return NextResponse.json({ error: 'csrf_validation_failed' }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL('/login', request.url));
  try {
    clearSessionCookies(response);
    const setCookies = await revokeTokens(request);
    setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
  } catch (error) {
    console.error('Logout failure:', error);
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
};

export const runtime = 'nodejs';
