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
    return payload.scopes
      .filter((scope): scope is string => typeof scope === 'string')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
  const value = payload.scope;
  if (Array.isArray(value)) {
    return value
      .filter((scope): scope is string => typeof scope === 'string')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
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

const collectIdentityRoles = (identity: UserIdentity | undefined): string[] => {
  if (!identity) {
    return [];
  }
  const roles = new Set<string>();
  if (Array.isArray(identity.roles)) {
    identity.roles
      .filter((role): role is string => typeof role === 'string')
      .forEach((role) => roles.add(role));
  }
  if (typeof identity.role === 'string' && identity.role.length > 0) {
    identity.role
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((role) => roles.add(role));
  }
  return Array.from(roles);
};

const deriveRoles = (payload: JwtPayload, identity: UserIdentity | undefined): string[] => {
  const roles = new Set<string>();
  parseRoles(payload).forEach((role) => roles.add(role));

  const inlineRole = payload.role;
  if (typeof inlineRole === 'string' && inlineRole.length > 0) {
    roles.add(inlineRole);
  } else if (Array.isArray(inlineRole)) {
    inlineRole
      .filter((entry): entry is string => typeof entry === 'string')
      .forEach((entry) => roles.add(entry));
  }

  collectIdentityRoles(identity).forEach((role) => roles.add(role));
  return Array.from(roles)
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
};

export interface UserIdentity {
  authenticated?: boolean;
  userId?: string;
  clientId?: string;
  role?: string;
  roles?: string[];
  identityKey?: string;
  needsPasswordChange?: boolean;
  permissions?: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  };
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
  needsPasswordChange?: boolean;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  };
}

const ANONYMOUS: SessionDetails = {
  authenticated: false,
  scopes: [],
  roles: [],
  permissions: {
    canModerate: false,
    canViewAnalytics: false,
    canManageUsers: false,
  },
  needsPasswordChange: false,
};

const computeIdentityKey = (identity: UserIdentity | undefined, payload: JwtPayload): string | undefined => {
  if (identity?.identityKey) {
    return identity.identityKey;
  }
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

  const scopes = normalizeScopes(payload);
  const roleClaims = deriveRoles(payload, identity);
  const normalizedRoles = roleClaims.map((role) => normalizeRole(role));

  const hasRoleData = normalizedRoles.length > 0;
  const hasModeratorRole =
    normalizedRoles.some((role) => role.includes('MODERATOR')) ||
    normalizeRole(identity?.role ?? '').includes('MODERATOR');
  const hasAnalystRole =
    normalizedRoles.some((role) => role.includes('ANALYST')) ||
    normalizeRole(identity?.role ?? '').includes('ANALYST');
  const hasSuperAdminRole =
    normalizedRoles.some((role) => role.includes('SUPER_ADMIN')) ||
    normalizeRole(identity?.role ?? '').includes('SUPER_ADMIN');

  const hasModerationWrite = hasScope(scopes, 'moderation:write');
  const hasAnalyticsScope = hasScopePrefix(scopes, 'analytics:');

  const identityPermissions = identity?.permissions;

  const derivedCanManageUsers = hasSuperAdminRole;
  const derivedAnalyticsCapable = hasAnalystRole || hasSuperAdminRole || (!hasRoleData && hasAnalyticsScope);
  const derivedCanModerate =
    hasModeratorRole || hasSuperAdminRole || (!hasRoleData && hasModerationWrite && !derivedAnalyticsCapable);

  const canManageUsers = identityPermissions?.canManageUsers ?? derivedCanManageUsers;
  const canViewAnalytics = identityPermissions?.canViewAnalytics ?? derivedAnalyticsCapable;
  const canModerate = identityPermissions?.canModerate ?? derivedCanModerate;

  const primaryRole =
    (identity?.roles && identity.roles.length > 0 && identity.roles[0]) ||
    identity?.role ||
    normalizedRoles[0];

  return {
    authenticated: identity?.authenticated ?? true,
    subject: payload.sub,
    name: payload.name ?? payload.preferred_username,
    email: payload.email,
    userId: identity?.userId ?? (typeof payload.sub === 'string' ? payload.sub : undefined),
    clientId: identity?.clientId,
    role: primaryRole ? normalizeRole(primaryRole) : identity?.role,
    scopes,
    roles: normalizedRoles,
    identityKey: computeIdentityKey(identity, payload),
    needsPasswordChange: Boolean(identity?.needsPasswordChange),
    permissions: {
      canModerate,
      canViewAnalytics,
      canManageUsers,
    },
  };
};
