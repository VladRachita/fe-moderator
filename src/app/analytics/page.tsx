'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAnalyticsSummary } from '@/services/analytics-service';
import { IAnalyticsSummary } from '@/types';
import { useSession } from '@/lib/auth/use-session';

const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<IAnalyticsSummary | null>(null);
  const router = useRouter();
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canViewAnalytics = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canViewAnalytics,
  );

  useEffect(() => {
    const fetchSummary = async () => {
      const summaryData = await getAnalyticsSummary();
      setSummary(summaryData);
    };

    if (canViewAnalytics) {
      void fetchSummary();
    } else {
      setSummary(null);
    }
  }, [canViewAnalytics, identityVersion]);

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
      router.replace('/login?returnTo=/analytics');
      return;
    }
    if (session.needsPasswordChange) {
      router.replace('/account/password');
      return;
    }
    if (!session.permissions.canViewAnalytics) {
      if (session.permissions.canManageUsers) {
        router.replace('/super-admin');
        return;
      }
      if (session.permissions.canModerate) {
        router.replace('/dashboard');
        return;
      }
      // HOSTS-ON-WEB V1 — defence-in-depth bounce: a HOST landing on
      // /analytics goes to /host instead of the generic auth-failed page.
      if (
        session.permissions.canManageBusinesses &&
        session.userType === 'HOST'
      ) {
        router.replace('/host');
        return;
      }
      router.replace('/login?error=authentication_failed');
    }
  }, [isSessionLoading, session, router]);

  useEffect(() => {
    setSummary(null);
  }, [identityVersion]);

  if (isSessionLoading) {
    return null;
  }

  if (!canViewAnalytics) {
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Pending Videos (24h)</h2>
          <p className="text-3xl">{summary?.pendingLast24hCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Approved Videos (24h)</h2>
          <p className="text-3xl">{summary?.approvedCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Rejected Videos (24h)</h2>
          <p className="text-3xl">{summary?.rejectedCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
