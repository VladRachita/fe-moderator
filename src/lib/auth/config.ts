const DEFAULT_SCOPE = 'openid profile moderation:read moderation:write';

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
  const appUrl = redirectUri ? undefined : getEnv('NEXT_PUBLIC_APP_URL');

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
