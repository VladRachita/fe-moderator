import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth/tokens';
import { revokeTokens } from '@/lib/auth/server-client';

export const POST = async (request: NextRequest) => {
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
