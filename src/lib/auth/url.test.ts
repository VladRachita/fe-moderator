import { describe, it, expect } from 'vitest';
import { sanitizeReturnTo, resolveRedirectUri } from '@/lib/auth/url';

describe('sanitizeReturnTo', () => {
    it('returns /dashboard for null', () => {
        expect(sanitizeReturnTo(null)).toBe('/dashboard');
    });

    it('returns /dashboard for undefined', () => {
        expect(sanitizeReturnTo(undefined)).toBe('/dashboard');
    });

    it('returns /dashboard for empty string', () => {
        expect(sanitizeReturnTo('')).toBe('/dashboard');
    });

    it('preserves valid relative paths', () => {
        expect(sanitizeReturnTo('/analytics')).toBe('/analytics');
        expect(sanitizeReturnTo('/dashboard?tab=pending')).toBe('/dashboard?tab=pending');
    });

    it('blocks absolute URLs (open redirect)', () => {
        expect(sanitizeReturnTo('https://evil.com/phish')).toBe('/dashboard');
        expect(sanitizeReturnTo('http://attacker.io')).toBe('/dashboard');
    });

    it('blocks protocol-relative URLs', () => {
        expect(sanitizeReturnTo('//evil.com/foo')).toBe('/dashboard');
    });

    it('blocks javascript: URLs', () => {
        expect(sanitizeReturnTo('javascript:alert(1)')).toBe('/dashboard');
    });

    it('preserves hash fragments', () => {
        expect(sanitizeReturnTo('/page#section')).toBe('/page#section');
    });

    it('strips external origin but keeps path', () => {
        // URL constructor with localhost base: external origin → /dashboard
        expect(sanitizeReturnTo('https://other.com/steal')).toBe('/dashboard');
    });
});

describe('resolveRedirectUri', () => {
    it('uses explicit redirectUri when provided', () => {
        const result = resolveRedirectUri(
            'http://localhost:3000/api/auth/login',
            'https://app.example.com/api/auth/callback',
        );
        expect(result).toBe('https://app.example.com/api/auth/callback');
    });

    it('constructs from appUrl when no explicit redirectUri', () => {
        const result = resolveRedirectUri(
            'http://localhost:3000/api/auth/login',
            undefined,
            'https://my-app.vercel.app',
        );
        expect(result).toBe('https://my-app.vercel.app/api/auth/callback');
    });

    it('falls back to request URL origin', () => {
        const result = resolveRedirectUri('http://localhost:3000/api/auth/login');
        expect(result).toBe('http://localhost:3000/api/auth/callback');
    });

    it('strips query and hash from appUrl', () => {
        const result = resolveRedirectUri(
            'http://localhost:3000/api/auth/login',
            undefined,
            'https://app.example.com/old-path?q=1#hash',
        );
        expect(result).toBe('https://app.example.com/api/auth/callback');
    });
});
