import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/auth/constants';

const protectedPaths = ['/dashboard', '/analytics', '/super-admin', '/account', '/host'];

const mediaSrc = process.env.MEDIA_CDN_URL ?? 'http://localhost:9000';
const isDev = process.env.NODE_ENV === 'development';

// V2.5: nonce-based CSP for `script-src`. `'unsafe-inline'` is eliminated
// from script-src so an injected inline `<script>` cannot execute and read
// the JS-readable `mod_csrf_token` cookie. Next.js auto-attaches the nonce
// to its own framework scripts when the CSP header is set on the request.
// `style-src` retains `'unsafe-inline'` because Next.js / next/font / React
// streaming inject inline `<style>` tags that cannot currently be nonced;
// style-only XSS has dramatically lower impact (no JS execution, no cookie
// read) so the residual risk is accepted.
const generateNonce = (): string => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
};

const buildCsp = (nonce: string): string => {
    const directives = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' https://fonts.gstatic.com`,
        `img-src 'self' data: ${mediaSrc}`,
        `media-src 'self' ${mediaSrc}`,
        `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com${isDev ? ' ws:' : ''}`,
        `base-uri 'self'`,
        `frame-ancestors 'none'`,
        `object-src 'none'`,
        `form-action 'self'`,
    ];
    return directives.join('; ');
};

const baseSecurityHeaders: Record<string, string> = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': 'no-store',
};

const applySecurityHeaders = (response: NextResponse, csp: string) => {
    Object.entries(baseSecurityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    response.headers.set('Content-Security-Policy', csp);
    return response;
};

export const proxy = (request: NextRequest) => {
    const { pathname } = request.nextUrl;

    if (protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        const sessionCookie = request.cookies.get(COOKIE_NAMES.accessToken);
        if (!sessionCookie) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('returnTo', pathname + request.nextUrl.search);
            return NextResponse.redirect(loginUrl);
        }
    }

    const nonce = generateNonce();
    const csp = buildCsp(nonce);

    // Pass nonce + CSP through the request so Server Components (via
    // `headers()`) can read the nonce, and Next.js can auto-inject it into
    // its own framework scripts.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    return applySecurityHeaders(response, csp);
};

export const config = {
    matcher: ['/((?!_next|api|static|favicon.ico).*)'],
};
