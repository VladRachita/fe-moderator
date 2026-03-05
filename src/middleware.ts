import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/auth/constants';

const protectedPaths = ['/dashboard', '/analytics'];

const mediaSrc = process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? 'http://localhost:9000';

const securityHeaders: Record<string, string> = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy':
        `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' ${mediaSrc}; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': 'no-store',
};

const applySecurityHeaders = (response: NextResponse) => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

export const middleware = (request: NextRequest) => {
    const { pathname } = request.nextUrl;

    if (protectedPaths.some((path) => pathname.startsWith(path))) {
        const sessionCookie = request.cookies.get(COOKIE_NAMES.accessToken);
        if (!sessionCookie) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('returnTo', pathname + request.nextUrl.search);
            return NextResponse.redirect(loginUrl);
        }
    }

    return applySecurityHeaders(NextResponse.next());
};

export const config = {
    matcher: ['/((?!_next|api|static|favicon.ico).*)'],
};
