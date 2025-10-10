  interface JwtPayload {
    sub?: string;
    name?: string;
    preferred_username?: string;
    email?: string;
    scope?: string | string[];
    scopes?: string[];
    resource_access?: Record<string, { roles?: string[] }>;
    realm_access?: { roles?: string[] };
    roles?: string[] | string;
    exp?: number;
    [key: string]: unknown;
  }

  const base64UrlDecode = (segment: string): string => {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    return Buffer.from(padded, 'base64').toString('utf8');
  };

  export const decodeJwtPayload = <T extends Record<string, unknown> = JwtPayload>(
    token: string,
  ): T => {
    const segments = token.split('.');
    if (segments.length < 2) {
      throw new Error('Invalid JWT format');
    }
    const payload = base64UrlDecode(segments[1] ?? '');
    return JSON.parse(payload) as T;
  };

  const normalizeScopes = (payload: JwtPayload): string[] => {
    if (Array.isArray(payload.scopes)) {
      return payload.scopes;
    }
    const value = payload.scope;
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return value.split(/\s+/).filter(Boolean);
    }
    return [];
  };

  const parseRoles = (payload: JwtPayload): string[] => {
    const roles = new Set<string>();

    payload.realm_access?.roles?.forEach((role) => roles.add(role));
    Object.values(payload.resource_access ?? {}).forEach((entry) => {
      entry.roles?.forEach((role) => roles.add(role));
    });

    const inline = payload.roles;
    if (Array.isArray(inline)) {
      inline.filter((role): role is string => typeof role === 'string').forEach((role) => roles.add(role));
    } else if (typeof inline === 'string') {
      inline
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean)
        .forEach((role) => roles.add(role));
    }

    return Array.from(roles);
  };

  const normalizeRole = (role: string): string => role.trim().toUpperCase();
  const hasRoleContaining = (roles: string[], snippet: string) =>
    roles.some((role) => normalizeRole(role).includes(normalizeRole(snippet)));

  const hasScope = (scopes: string[], target: string) => scopes.includes(target);
  const hasScopePrefix = (scopes: string[], prefix: string) => scopes.some((scope) => scope.startsWith(prefix));

  export interface SessionDetails {
    authenticated: boolean;
    subject?: string;
    name?: string;
    email?: string;
    scopes: string[];
    roles: string[];
    permissions: {
      canModerate: boolean;
      canViewAnalytics: boolean;
    };
  }

  const ANONYMOUS: SessionDetails = {
    authenticated: false,
    scopes: [],
    roles: [],
    permissions: {
      canModerate: false,
      canViewAnalytics: false,
    },
  };

  export const mapSessionDetails = (payload: JwtPayload): SessionDetails => {
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp <= now) {
      return ANONYMOUS;
    }

    const scopes = normalizeScopes(payload);
    const roles = parseRoles(payload);

    const hasRoleData = roles.length > 0;
    const hasModeratorRole = hasRoleContaining(roles, 'MODERATOR');
    const hasAnalystRole = hasRoleContaining(roles, 'ANALYST');

    const hasModerationWrite = hasScope(scopes, 'moderation:write');
    const hasAnalyticsScope = hasScopePrefix(scopes, 'analytics:');

  const analyticsCapable = hasAnalystRole || (!hasRoleData && hasAnalyticsScope);
   let canModerate = hasModeratorRole || (!hasRoleData && hasModerationWrite && !analyticsCapable);
  const canViewAnalytics = analyticsCapable;
  
    if (!hasModeratorRole && canViewAnalytics) {
     canModerate = false;
    }

    return {
      authenticated: true,
      subject: payload.sub,
      name: payload.name ?? payload.preferred_username,
      email: payload.email,
      scopes,
      roles,
      permissions: {
        canModerate,
        canViewAnalytics,
      },
    };
  };