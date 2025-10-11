import { useEffect, useState, useCallback, useRef } from 'react';
import { getSession, SessionFetchError } from '@/services/session-service';
import { IUserSession } from '@/types';
import { subscribeSessionChange } from '@/lib/auth/session-events';

interface UseSessionResult {
  session: IUserSession | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  identityVersion: number;
}

export const useSession = (): UseSessionResult => {
  const [session, setSession] = useState<IUserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [identityVersion, setIdentityVersion] = useState<number>(0);
  const identityRef = useRef<string | undefined>(undefined);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionData = await getSession();
      if (
        sessionData.identityKey &&
        identityRef.current &&
        sessionData.identityKey !== identityRef.current
      ) {
        setIdentityVersion((value) => value + 1);
      }
      identityRef.current = sessionData.identityKey;
      setSession(sessionData);
    } catch (err) {
      const typedError = err instanceof Error ? err : new Error('Unknown session error');
      setError(typedError);
      setSession(null);
      identityRef.current = undefined;
      setIdentityVersion((value) => value + 1);
      if (err instanceof SessionFetchError && err.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login?error=refresh_failed';
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const unsubscribe = subscribeSessionChange(() => {
      void loadSession();
    });
    return unsubscribe;
  }, [loadSession]);

  return {
    session,
    isLoading,
    error,
    refresh: loadSession,
    identityVersion,
  };
};
