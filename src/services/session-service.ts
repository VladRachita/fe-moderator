import { IUserSession } from '@/types';

export class SessionFetchError extends Error {
  status: number;
  code?: string;

  constructor(status: number, code?: string) {
    super(`Failed to fetch session: ${status}`);
    this.name = 'SessionFetchError';
    this.status = status;
    this.code = code;
  }
}

export const getSession = async (): Promise<IUserSession> => {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-store',
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (IUserSession & { error?: string })
    | null;

  if (!payload) {
    throw new SessionFetchError(response.status);
  }

  if (response.status === 401) {
    throw new SessionFetchError(response.status, payload.error);
  }

  if (!response.ok) {
    return payload;
  }

  return payload;
};
