'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/use-session';

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading: isSessionLoading } = useSession();

  const isHost = Boolean(
    session?.authenticated &&
      !session?.needsPasswordChange &&
      session.permissions.canManageBusinesses &&
      session.userType === 'HOST',
  );

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }
    if (session?.error === 'logout' || session?.error === 'logout_failed') {
      const message = session.error === 'logout_failed' ? 'logout_failed' : 'logged_out';
      router.replace(`/login?message=${message}`);
      return;
    }
    if (session?.error === 'forbidden') {
      router.replace('/login?error=authorization_failed');
      return;
    }
    if (!session?.authenticated) {
      router.replace(`/login?returnTo=${pathname}`);
      return;
    }
    if (session.needsPasswordChange) {
      router.replace('/account/password');
      return;
    }
    // Defence-in-depth: a platform user landing on /host (e.g. via direct URL)
    // is bounced to their own dashboard. The login redirect logic should
    // already prevent this; this guard catches direct-URL access.
    if (!session.permissions.canManageBusinesses || session.userType !== 'HOST') {
      if (session.permissions.canModerate) {
        router.replace('/dashboard');
        return;
      }
      if (session.permissions.canViewAnalytics) {
        router.replace('/analytics');
        return;
      }
      if (session.permissions.canManageUsers) {
        router.replace('/super-admin');
        return;
      }
      router.replace('/login?error=authorization_failed');
    }
  }, [isSessionLoading, session, router, pathname]);

  if (isSessionLoading || !isHost) {
    return null;
  }

  return <main className="min-h-screen bg-gray-50">{children}</main>;
}
