import { NextRequest, NextResponse } from 'next/server';
import { decryptAccessToken } from '@/lib/auth/tokens';
import { decodeJwtPayload, mapSessionDetails } from '@/lib/auth/jwt';

const anonymousSession = {
  authenticated: false,
  scopes: [] as string[],
  roles: [] as string[],
  permissions: {
    canModerate: false,
    canViewAnalytics: false,
  },
};

export const GET = (request: NextRequest) => {
  try {
    const token = decryptAccessToken(request);
    if (!token) {
      return NextResponse.json(anonymousSession, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const payload = decodeJwtPayload(token);
    const session = mapSessionDetails(payload);
    return NextResponse.json(session, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to resolve session', error);
    return NextResponse.json(anonymousSession, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
};

export const runtime = 'nodejs';
