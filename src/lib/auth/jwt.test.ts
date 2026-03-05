import { describe, it, expect } from 'vitest';
import { decodeJwtPayload, mapSessionDetails } from '@/lib/auth/jwt';

const encodeJwtPayload = (payload: Record<string, unknown>): string => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.fake-signature`;
};

describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', () => {
        const token = encodeJwtPayload({ sub: 'user-1', role: 'MODERATOR' });
        const result = decodeJwtPayload(token);
        expect(result.sub).toBe('user-1');
        expect(result.role).toBe('MODERATOR');
    });

    it('throws on invalid JWT format', () => {
        expect(() => decodeJwtPayload('not-a-jwt')).toThrow('Invalid JWT format');
    });

    it('handles padded base64url encoding', () => {
        const token = encodeJwtPayload({ sub: 'a' });
        const result = decodeJwtPayload(token);
        expect(result.sub).toBe('a');
    });
});

describe('mapSessionDetails', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;

    it('maps moderator with moderation scopes', () => {
        const payload = {
            sub: 'user-1',
            email: 'mod@test.com',
            roles: ['MODERATOR'],
            scope: 'moderation:read moderation:write',
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.authenticated).toBe(true);
        expect(result.permissions.canModerate).toBe(true);
        expect(result.permissions.canViewAnalytics).toBe(false);
        expect(result.permissions.canManageUsers).toBe(false);
        expect(result.roles).toContain('MODERATOR');
    });

    it('maps analyst with analytics scopes', () => {
        const payload = {
            sub: 'user-2',
            roles: ['ANALYST'],
            scope: 'analytics:read',
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.permissions.canViewAnalytics).toBe(true);
        expect(result.permissions.canModerate).toBe(false);
    });

    it('maps super admin with full permissions', () => {
        const payload = {
            sub: 'admin-1',
            roles: ['ROLE_SUPER_ADMIN'],
            scope: 'moderation:read moderation:write analytics:read admin:users:read admin:users:write',
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.permissions.canModerate).toBe(true);
        expect(result.permissions.canViewAnalytics).toBe(true);
        expect(result.permissions.canManageUsers).toBe(true);
    });

    it('returns anonymous for expired token', () => {
        const payload = {
            sub: 'user-1',
            roles: ['MODERATOR'],
            exp: Math.floor(Date.now() / 1000) - 100,
        };
        const result = mapSessionDetails(payload);
        expect(result.authenticated).toBe(false);
        expect(result.permissions.canModerate).toBe(false);
    });

    it('respects identity permissions over derived ones', () => {
        const payload = {
            sub: 'user-1',
            scope: '',
            exp: futureExp,
        };
        const identity = {
            authenticated: true,
            userId: 'user-1',
            role: 'MODERATOR',
            permissions: {
                canModerate: true,
                canViewAnalytics: true,
                canManageUsers: false,
            },
        };
        const result = mapSessionDetails(payload, identity);
        expect(result.permissions.canModerate).toBe(true);
        expect(result.permissions.canViewAnalytics).toBe(true);
        expect(result.permissions.canManageUsers).toBe(false);
    });

    it('handles needsPasswordChange from identity', () => {
        const payload = { sub: 'user-1', exp: futureExp };
        const identity = {
            authenticated: true,
            needsPasswordChange: true,
            permissions: { canModerate: true, canViewAnalytics: false, canManageUsers: false },
        };
        const result = mapSessionDetails(payload, identity);
        expect(result.needsPasswordChange).toBe(true);
    });

    it('handles comma-separated roles string', () => {
        const payload = {
            sub: 'user-1',
            roles: 'MODERATOR,ANALYST' as unknown as string[],
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.roles).toContain('MODERATOR');
        expect(result.roles).toContain('ANALYST');
    });

    it('handles scope as array', () => {
        const payload = {
            sub: 'user-1',
            scope: ['moderation:write', 'analytics:read'],
            roles: ['MODERATOR'],
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.scopes).toContain('moderation:write');
        expect(result.scopes).toContain('analytics:read');
    });
});
