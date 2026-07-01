'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listAdminHosts,
  disableHost,
  enableHost,
  deleteHost,
  AdminHostError,
  type HostAccountStatus,
  type IAdminHostSummary,
} from '@/services/admin-host-service';
import { useSession } from '@/lib/auth/use-session';

const STATUS_BADGE: Record<HostAccountStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DISABLED: 'bg-red-100 text-red-800',
  LOCKED: 'bg-amber-100 text-amber-800',
};

const HostManagementPage: React.FC = () => {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [hosts, setHosts] = useState<IAdminHostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }),
    [],
  );

  const loadHosts = useCallback(async (): Promise<void> => {
    if (!canManageUsers) {
      setHosts([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const page = await listAdminHosts(0, 100);
      setHosts(page.hosts);
    } catch (err) {
      if (err instanceof AdminHostError && (err.status === 401 || err.status === 403)) {
        router.replace('/login?error=authorization_failed');
        return;
      }
      setError(err instanceof AdminHostError ? err.message : 'Failed to load hosts.');
      setHosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [canManageUsers, router]);

  useEffect(() => {
    if (isSessionLoading || !canManageUsers) {
      setHosts([]);
      return;
    }
    void loadHosts();
  }, [isSessionLoading, canManageUsers, loadHosts]);

  const setHostBusy = useCallback((hostUserId: string, value: boolean) => {
    setBusy((prev) => {
      const next = { ...prev };
      if (value) {
        next[hostUserId] = true;
      } else {
        delete next[hostUserId];
      }
      return next;
    });
  }, []);

  const handleDisable = useCallback(
    async (host: IAdminHostSummary) => {
      const confirmed = window.confirm(
        `Disable ${host.fullName} (${host.primaryBusinessName})?\n\n` +
          'This hides ALL of their content, logs them out immediately, and cancels + ' +
          'notifies their upcoming confirmed reservations. It is reversible.',
      );
      if (!confirmed) {
        return;
      }
      setHostBusy(host.hostUserId, true);
      setNotice(null);
      setError(null);
      try {
        const result = await disableHost(host.hostUserId);
        setNotice(
          `Disabled ${host.fullName}. ${result.businessesHidden} business(es) hidden, ` +
            `${result.reservationsCancelled} upcoming reservation(s) cancelled.`,
        );
        await loadHosts();
      } catch (err) {
        setError(err instanceof AdminHostError ? err.message : 'Failed to disable host.');
      } finally {
        setHostBusy(host.hostUserId, false);
      }
    },
    [loadHosts, setHostBusy],
  );

  const handleEnable = useCallback(
    async (host: IAdminHostSummary) => {
      const confirmed = window.confirm(
        `Re-enable ${host.fullName}?\n\n` +
          'Their content becomes visible again and they can log in. ' +
          'Previously cancelled reservations are NOT restored.',
      );
      if (!confirmed) {
        return;
      }
      setHostBusy(host.hostUserId, true);
      setNotice(null);
      setError(null);
      try {
        await enableHost(host.hostUserId);
        setNotice(`Re-enabled ${host.fullName}.`);
        await loadHosts();
      } catch (err) {
        setError(err instanceof AdminHostError ? err.message : 'Failed to enable host.');
      } finally {
        setHostBusy(host.hostUserId, false);
      }
    },
    [loadHosts, setHostBusy],
  );

  const handleDelete = useCallback(
    async (host: IAdminHostSummary) => {
      const typed = window.prompt(
        `PERMANENTLY DELETE ${host.fullName} and ALL of their data — account, businesses, ` +
          `videos, thumbnails, coupons, reservations and media. This CANNOT be undone.\n\n` +
          `Type the business name "${host.primaryBusinessName}" to confirm:`,
      );
      if (typed === null) {
        return;
      }
      if (typed.trim() !== host.primaryBusinessName.trim()) {
        setError('Deletion cancelled — the confirmation text did not match the business name.');
        return;
      }
      setHostBusy(host.hostUserId, true);
      setNotice(null);
      setError(null);
      try {
        await deleteHost(host.hostUserId);
        setNotice(`Permanently deleted ${host.fullName}.`);
        await loadHosts();
      } catch (err) {
        setError(err instanceof AdminHostError ? err.message : 'Failed to delete host.');
      } finally {
        setHostBusy(host.hostUserId, false);
      }
    },
    [loadHosts, setHostBusy],
  );

  return (
    <section className="rounded-lg bg-white p-8 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            Host Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Disable (reversible) or permanently delete HOST accounts. Disabling hides all of a
            host&apos;s content, logs them out, and cancels their upcoming reservations.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            void loadHosts();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {notice && (
        <div className="mt-4 rounded border border-green-400 bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Host</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Business</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!isLoading && hosts.length === 0 && !error ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                  No hosts found.
                </td>
              </tr>
            ) : null}
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                  Loading hosts&hellip;
                </td>
              </tr>
            ) : null}
            {!isLoading &&
              hosts.map((host) => {
                const isBusy = busy[host.hostUserId] === true;
                const isDisabled = host.accountStatus === 'DISABLED';
                return (
                  <tr key={host.hostUserId} className={isBusy ? 'bg-blue-50/40' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{host.fullName}</div>
                      <div className="text-xs text-gray-500">{host.email ?? 'No email on file'}</div>
                      <div className="text-xs text-gray-500">{host.phone || 'No phone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{host.primaryBusinessName || '—'}</div>
                      <div className="text-xs text-gray-500">
                        {host.primaryBusinessCategory}
                        {host.city ? ` · ${host.city}` : ''}
                        {host.businessCount > 1 ? ` · +${host.businessCount - 1} more` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[host.accountStatus]}`}
                      >
                        {host.accountStatus}
                      </span>
                      {!host.contentVisible && !isDisabled ? (
                        <div className="mt-1 text-xs text-gray-400">content hidden</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {dateFormatter.format(new Date(host.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isDisabled ? (
                          <button
                            type="button"
                            className="rounded border border-green-500 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              void handleEnable(host);
                            }}
                            disabled={isBusy}
                          >
                            Enable
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              void handleDisable(host);
                            }}
                            disabled={isBusy}
                          >
                            Disable
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded border border-red-500 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            void handleDelete(host);
                          }}
                          disabled={isBusy}
                        >
                          Delete
                        </button>
                      </div>
                      {isBusy && <p className="mt-1 text-right text-xs text-blue-600">Working&hellip;</p>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default HostManagementPage;
