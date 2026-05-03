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
                canManageBusinesses: false,
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
            permissions: {
                canModerate: true,
                canViewAnalytics: false,
                canManageUsers: false,
                canManageBusinesses: false,
            },
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

    // HOSTS-ON-WEB V1 — HOST detection + userType discriminator + mutual
    // exclusivity with platform roles. The `app.host` scope is granted by
    // the backend's ScopePolicyService.determineApplicationScopes ONLY for
    // UsersTypes.HOST users; platform staff go through determinePlatformScopes
    // which returns role-fixed scopes regardless of what the BFF requested.

    it('maps HOST users with app.host scope', () => {
        const payload = {
            sub: 'host-1',
            roles: ['HOST'],
            scope: 'app.host',
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.authenticated).toBe(true);
        expect(result.permissions.canManageBusinesses).toBe(true);
        expect(result.permissions.canModerate).toBe(false);
        expect(result.permissions.canViewAnalytics).toBe(false);
        expect(result.permissions.canManageUsers).toBe(false);
        expect(result.userType).toBe('HOST');
    });

    it('does not flag platform users as HOST when DEFAULT_SCOPE includes app.host', () => {
        // Backend invariant: ScopePolicyService.determinePlatformScopes returns
        // ONLY role-fixed scopes; even if the BFF requested app.host, the
        // platform user's token will NOT carry it. This test pins that
        // assumption: a moderator with only platform scopes never accidentally
        // becomes a HOST.
        const payload = {
            sub: 'mod-1',
            roles: ['MODERATOR'],
            scope: 'moderation:read moderation:write',
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.permissions.canManageBusinesses).toBe(false);
        expect(result.permissions.canModerate).toBe(true);
        expect(result.userType).toBe('PLATFORM');
    });

    it('keeps a defensive PLATFORM userType when BOTH host and platform signals are present', () => {
        // Defence-in-depth: if a buggy/stale token somehow carries both
        // app.host AND a platform scope, treat as PLATFORM and surface the
        // platform permission. The backend DB constraint prevents this in
        // practice, but the discriminator must not silently downgrade
        // platform staff to HOST.
        const payload = {
            sub: 'stale-1',
            roles: ['MODERATOR'],
            scope: 'moderation:read moderation:write app.host',
            exp: futureExp,
        };
        const result = mapSessionDetails(payload);
        expect(result.userType).toBe('PLATFORM');
        expect(result.permissions.canModerate).toBe(true);
        // canManageBusinesses still reflects the scope so audits can detect
        // the anomaly, but the routing-relevant userType is PLATFORM.
        expect(result.permissions.canManageBusinesses).toBe(true);
    });

    it('respects identity.userType + identity.permissions.canManageBusinesses', () => {
        const payload = { sub: 'host-2', exp: futureExp };
        const identity = {
            authenticated: true,
            userId: 'host-2',
            role: 'HOST',
            userType: 'HOST' as const,
            permissions: {
                canModerate: false,
                canViewAnalytics: false,
                canManageUsers: false,
                canManageBusinesses: true,
            },
        };
        const result = mapSessionDetails(payload, identity);
        expect(result.permissions.canManageBusinesses).toBe(true);
        expect(result.userType).toBe('HOST');
        expect(result.permissions.canModerate).toBe(false);
    });

    it('production path: JWT scope app.host AND identity.permissions.canManageBusinesses=true → HOST', () => {
        // Reproduces the real /api/auth/login + /api/auth/session chain:
        //   1. Backend issues JWT with `scope: "app.host"` for a HOST user.
        //   2. fetchUserIdentity (server-client.ts) calls /api/v1/me which
        //      returns permissions.canManageBusinesses=true and constructs
        //      identity.userType='HOST' from the derived fallback.
        //   3. mapSessionDetails sees BOTH the JWT scope AND the identity
        //      with canManageBusinesses=true.
        // This is the load-bearing happy-path that gates whether HOSTs land
        // on /host or get bounced with `error=authorization_failed`.
        const payload = {
            sub: 'host-3',
            roles: ['HOST'],
            scope: 'app.host',
            exp: futureExp,
        };
        const identity = {
            authenticated: true,
            userId: 'host-3',
            role: 'HOST',
            userType: 'HOST' as const,
            permissions: {
                canModerate: false,
                canViewAnalytics: false,
                canManageUsers: false,
                canManageBusinesses: true,
            },
        };
        const result = mapSessionDetails(payload, identity);
        expect(result.authenticated).toBe(true);
        expect(result.permissions.canManageBusinesses).toBe(true);
        expect(result.permissions.canModerate).toBe(false);
        expect(result.permissions.canViewAnalytics).toBe(false);
        expect(result.permissions.canManageUsers).toBe(false);
        expect(result.userType).toBe('HOST');
    });

    it('returns anonymous PLATFORM session for expired HOST token', () => {
        const payload = {
            sub: 'host-3',
            roles: ['HOST'],
            scope: 'app.host',
            exp: Math.floor(Date.now() / 1000) - 100,
        };
        const result = mapSessionDetails(payload);
        expect(result.authenticated).toBe(false);
        expect(result.permissions.canManageBusinesses).toBe(false);
        expect(result.userType).toBe('PLATFORM');
    });
});
