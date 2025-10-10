import { useEffect, useState, useCallback } from 'react';
import { getSession } from '@/services/session-service';
import { IUserSession } from '@/types';

interface UseSessionResult {
  session: IUserSession | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useSession = (): UseSessionResult => {
  const [session, setSession] = useState<IUserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionData = await getSession();
      setSession(sessionData);
    } catch (err) {
      const typedError = err instanceof Error ? err : new Error('Unknown session error');
      setError(typedError);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return {
    session,
    isLoading,
    error,
    refresh: loadSession,
  };
};
