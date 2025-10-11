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
    inline
      .filter((role): role is string => typeof role === 'string')
      .forEach((role) => roles.add(role));
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

const hasScope = (scopes: string[], target: string) => scopes.includes(target);
const hasScopePrefix = (scopes: string[], prefix: string) =>
  scopes.some((scope) => scope.startsWith(prefix));

export interface UserIdentity {
  userId?: string;
  clientId?: string;
  role?: string;
  scopes?: string[];
}

export interface SessionDetails {
  authenticated: boolean;
  subject?: string;
  name?: string;
  email?: string;
  userId?: string;
  clientId?: string;
  role?: string;
  scopes: string[];
  roles: string[];
  identityKey?: string;
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

const ensureRoleList = (identity: UserIdentity | undefined, fallbackRoles: string[]): string[] => {
  if (!identity?.role) {
    return fallbackRoles;
  }
  return identity.role
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
};

const computeIdentityKey = (identity: UserIdentity | undefined, payload: JwtPayload): string | undefined => {
  const userId = identity?.userId ?? (typeof payload.sub === 'string' ? payload.sub : undefined);
  if (!userId && !identity?.clientId) {
    return undefined;
  }
  return `${userId ?? ''}::${identity?.clientId ?? ''}`;
};

export const mapSessionDetails = (
  payload: JwtPayload,
  identity?: UserIdentity,
): SessionDetails => {
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
  const now = Math.floor(Date.now() / 1000);
  if (exp && exp <= now) {
    return ANONYMOUS;
  }

  const scopes = identity?.scopes ?? normalizeScopes(payload);
  const roles = ensureRoleList(identity, parseRoles(payload));
  const normalizedRoles = roles.map((role) => normalizeRole(role));

  const hasRoleData = normalizedRoles.length > 0;
  const hasModeratorRole =
    normalizedRoles.some((role) => role.includes('MODERATOR')) ||
    normalizeRole(identity?.role ?? '').includes('MODERATOR');
  const hasAnalystRole =
    normalizedRoles.some((role) => role.includes('ANALYST')) ||
    normalizeRole(identity?.role ?? '').includes('ANALYST');

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
    userId: identity?.userId ?? payload.sub,
    clientId: identity?.clientId,
    role: identity?.role,
    scopes,
    roles,
    identityKey: computeIdentityKey(identity, payload),
    permissions: {
      canModerate,
      canViewAnalytics,
    },
  };
};
