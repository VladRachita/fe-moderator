'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { emitSessionChange } from '@/lib/auth/session-events';
import { broadcastLogout, type LogoutReason } from '@/lib/auth/logout-channel';

interface LogoutControls {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  error: Error | null;
}

export const useLogout = (forceLogout: (reason?: LogoutReason) => void): LogoutControls => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setError(null);
    let redirectReason: LogoutReason = 'logout';
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok && response.status !== 401 && response.status !== 403) {
        const message = `Logout failed: ${response.status}`;
        throw new Error(message);
      }
    } catch (err) {
      const typedError = err instanceof Error ? err : new Error('Logout failed');
      setError(typedError);
      console.error('Logout failed', typedError);
      redirectReason = 'logout_failed';
    } finally {
      forceLogout(redirectReason);
      broadcastLogout(redirectReason);
      emitSessionChange();
      const messageParam = redirectReason === 'logout_failed' ? 'logout_failed' : 'logged_out';
      router.replace(`/login?message=${messageParam}`);
      setIsLoggingOut(false);
    }
  }, [forceLogout, router]);

  return {
    logout,
    isLoggingOut,
    error,
  };
};
