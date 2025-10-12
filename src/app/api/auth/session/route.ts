import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, decryptAccessToken } from '@/lib/auth/tokens';
import { decodeJwtPayload, mapSessionDetails } from '@/lib/auth/jwt';
import { BackendIdentityError, fetchUserIdentity } from '@/lib/auth/server-client';

const anonymousSession = {
  authenticated: false,
  scopes: [] as string[],
  roles: [] as string[],
  needsPasswordChange: false,
  permissions: {
    canModerate: false,
    canViewAnalytics: false,
    canManageUsers: false,
  },
};

export const GET = async (request: NextRequest) => {
  try {
    const token = decryptAccessToken(request);
    if (!token) {
      return NextResponse.json(anonymousSession, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const payload = decodeJwtPayload(token);
    const identity = await fetchUserIdentity(token);
    const session = mapSessionDetails(payload, identity);
    return NextResponse.json(session, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof BackendIdentityError) {
      if (error.status === 401) {
        const response = NextResponse.json(
          { ...anonymousSession, error: 'reauth_required' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        );
        clearSessionCookies(response);
        return response;
      }
      if (error.status === 403) {
        return NextResponse.json(
          { ...anonymousSession, error: 'forbidden' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    console.error('Failed to resolve session', error);
    return NextResponse.json(anonymousSession, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
};

export const runtime = 'nodejs';
