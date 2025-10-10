import { IUserSession } from '@/types';

export const getSession = async (): Promise<IUserSession> => {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-store',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  return (await response.json()) as IUserSession;
};
