export const COOKIE_NAMES = {
  accessToken: 'mod_access_token',
  refreshToken: 'mod_refresh_token',
  sessionMeta: 'mod_session_meta',
  csrfToken: 'mod_csrf_token',
  oauthState: 'mod_oauth_state',
  pkceVerifier: 'mod_pkce_v',
  returnTo: 'mod_return_to',
};

export const COOKIE_MAX_AGE = {
  accessToken: 10 * 60, // 10 minutes
  refreshToken: 7 * 24 * 60 * 60, // 7 days (mirrors backend)
  oauthTransient: 5 * 60, // 5 minutes
};

export const CSRF_HEADER = 'x-csrf-token';

export const BACKEND_REFRESH_COOKIE = '__Host-vsanity-refresh';
