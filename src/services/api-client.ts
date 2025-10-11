
import axios from 'axios';
import { emitSessionChange } from '@/lib/auth/session-events';

const SAFE_METHODS = ['get', 'head', 'options'];
const CSRF_COOKIE = 'mod_csrf_token';

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const apiClient = axios.create({
  baseURL: '/api/proxy',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (!SAFE_METHODS.includes(method)) {
    const csrfToken = readCookie(CSRF_COOKIE);
    if (csrfToken) {
      config.headers = config.headers ?? {};
      config.headers['x-csrf-token'] = csrfToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      const refreshedHeader = response.headers['x-session-refreshed'];
      if (refreshedHeader === '1' || refreshedHeader === 'true') {
        emitSessionChange();
      }
    }
    return response;
  },
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      window.location.href = '/login?error=session_expired';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
