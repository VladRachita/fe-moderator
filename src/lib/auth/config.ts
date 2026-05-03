// DEFAULT_SCOPE is sent on every authorize request from the fe-moderator BFF.
// The backend's ScopePolicyService routes scopes per user-type:
//   - Platform staff (MODERATOR / ANALYST / SUPER_ADMIN) go through
//     determinePlatformScopes, which IGNORES requestedScopes for moderator and
//     super-admin (returns role-fixed scopes) and tolerates extra scopes for
//     analyst as long as `analytics:read` is present. Adding `app.host` here
//     therefore does NOT affect platform login.
//   - HOST users go through determineApplicationScopes, which grants only
//     `app.host` from the request set. HOSTs ignore the platform scopes here.
// This single union string lets ALL user types authenticate via the same
// fe-moderator login flow without per-type scope discovery.
const DEFAULT_SCOPE =
  'moderation:read moderation:write analytics:read admin:users:read admin:users:write app.host';

export interface AuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  clientId: string;
  scope: string;
  cookieSecret: string;
  redirectUri?: string;
  appUrl?: string;
}

const getEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

const getRequiredEnv = (name: string): string => {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing expected environment variable: ${name}`);
  }
  return value;
};

export const getAuthConfig = (): AuthConfig => {
  const baseUrl = getEnv('AUTH_SERVER_BASE_URL') ?? 'http://localhost:8080';
  const clientId = getRequiredEnv('AUTH_CLIENT_ID');
  const redirectUri = getEnv('AUTH_REDIRECT_URI');
  const scope = getEnv('AUTH_SCOPE') ?? DEFAULT_SCOPE;
  const cookieSecret = getRequiredEnv('AUTH_COOKIE_SECRET');
  const appUrl = redirectUri ? undefined : getEnv('APP_URL');

  const joinUrl = (path: string) => `${baseUrl.replace(/\/+$/, '')}${path}`;

  return {
    authorizationEndpoint: joinUrl('/oauth2/authorize'),
    tokenEndpoint: joinUrl('/oauth2/token'),
    revocationEndpoint: joinUrl('/oauth2/revoke'),
    clientId,
    scope,
    cookieSecret,
    redirectUri,
    appUrl,
  };
};
