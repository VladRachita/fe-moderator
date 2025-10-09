export const sanitizeReturnTo = (value: string | null | undefined): string => {
  if (!value) {
    return '/dashboard';
  }
  try {
    const url = new URL(value, 'http://localhost');
    if (url.origin !== 'http://localhost') {
      return '/dashboard';
    }
    return url.pathname + url.search + url.hash;
  } catch {
    if (value.startsWith('/')) {
      return value;
    }
    return '/dashboard';
  }
};

export const resolveRedirectUri = (
  requestUrl: string,
  explicitUri?: string,
  appUrl?: string,
): string => {
  if (explicitUri) {
    return explicitUri;
  }
  if (appUrl) {
    const base = new URL(appUrl);
    base.pathname = '/api/auth/callback';
    base.search = '';
    base.hash = '';
    return base.toString();
  }
  const url = new URL(requestUrl);
  url.pathname = '/api/auth/callback';
  url.search = '';
  url.hash = '';
  return url.toString();
};
