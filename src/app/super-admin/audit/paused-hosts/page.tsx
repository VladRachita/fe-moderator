'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditServiceError } from '@/services/audit-service';
import { getPausedHosts } from '@/services/paused-hosts-service';
import type { PausedHostRow, PausedHostsPage } from '@/services/paused-hosts-service';
import { useSession } from '@/lib/auth/use-session';
import {
  AuditPageShell,
  formatTimestamp,
  Pagination,
  shortHash,
  StatCard,
} from '../_shared/AuditPageShell';

const PAGE_SIZE = 20;

const CATEGORY_FILTER_OPTIONS = ['ALL', 'RESTAURANT', 'SERVICE', 'STAY'] as const;
type CategoryFilter = (typeof CATEGORY_FILTER_OPTIONS)[number];

const PausedHostsPageView: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canView = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<PausedHostsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      setResponse(await getPausedHosts(days, page, PAGE_SIZE));
    } catch (err) {
      setError(err instanceof AuditServiceError ? err.message : 'Failed to load paused hosts');
    } finally {
      setLoading(false);
    }
  }, [canView, days, page]);

  useEffect(() => {
    void load();
  }, [load, identityVersion]);

  useEffect(() => {
    setPage(0);
  }, [days]);

  const filteredRows = useMemo<PausedHostRow[]>(() => {
    const rows = response?.rows ?? [];
    if (categoryFilter === 'ALL') return rows;
    return rows.filter((r) => r.businessCategory === categoryFilter);
  }, [response, categoryFilter]);

  const currentlyPausedCount = useMemo(
    () => (response?.rows ?? []).filter((r) => r.currentlyPaused).length,
    [response],
  );
  const toggledInWindowCount = response?.rows.length ?? 0;

  if (isSessionLoading || !canView) return null;

  return (
    <AuditPageShell
      title="Paused HOSTs"
      subtitle="HOSTs currently not accepting reservations, plus recent pause/resume windows. Reach out to check in or remind them to resume."
      days={days}
      onDaysChange={setDays}
      onRefresh={() => void load()}
      isLoading={loading}
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Currently paused" value={currentlyPausedCount} />
        <StatCard label="Toggled in window" value={toggledInWindowCount} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Paused / recently toggled</h2>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">Category</span>
            <select
              data-testid="category-filter"
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 shadow-sm focus:border-gray-500 focus:outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            >
              {CATEGORY_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'ALL' ? 'All' : opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(() => {
          if (loading && !response) {
            return <div className="py-12 text-center text-sm text-gray-500">Loading...</div>;
          }
          if (!response || response.rows.length === 0) {
            return (
              <div className="py-12 text-center text-sm text-gray-500">
                No HOSTs paused or toggled in this window. Nothing to follow up on right now.
              </div>
            );
          }
          if (filteredRows.length === 0) {
            return (
              <div className="py-12 text-center text-sm text-gray-500">
                No HOSTs match the selected category.
              </div>
            );
          }
          return (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">HOST name</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Business</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Paused from</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Paused to</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Host hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRows.map((r) => {
                      const startLabel = r.pauseStartAt
                        ? formatTimestamp(r.pauseStartAt)
                        : r.currentlyPaused
                          ? `before ${days}d window`
                          : '—';
                      const endLabel = r.currentlyPaused
                        ? 'Still paused'
                        : r.pauseEndAt
                          ? formatTimestamp(r.pauseEndAt)
                          : '—';
                      return (
                        <tr key={r.businessId}>
                          <td className="px-3 py-2">
                            <span
                              className={
                                r.currentlyPaused
                                  ? 'inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800'
                                  : 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800'
                              }
                            >
                              {r.currentlyPaused ? 'Paused' : 'Resumed'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs font-medium text-gray-900">
                            {r.hostFullName || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            {r.hostPhone ? (
                              <a
                                href={`tel:${r.hostPhone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {r.hostPhone}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">{r.businessName}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{r.businessCategory}</td>
                          <td
                            className={
                              r.currentlyPaused && !r.pauseStartAt
                                ? 'whitespace-nowrap px-3 py-2 text-xs italic text-gray-500'
                                : 'whitespace-nowrap px-3 py-2 text-xs text-gray-700'
                            }
                          >
                            {startLabel}
                          </td>
                          <td
                            className={
                              r.currentlyPaused
                                ? 'whitespace-nowrap px-3 py-2 text-xs font-semibold text-red-700'
                                : 'whitespace-nowrap px-3 py-2 text-xs text-gray-700'
                            }
                          >
                            {endLabel}
                          </td>
                          <td
                            className="px-3 py-2 font-mono text-xs text-gray-500"
                            title={r.hostUserIdHash ?? ''}
                          >
                            {shortHash(r.hostUserIdHash)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={response.page}
                hasNext={response.hasNext}
                isLoading={loading}
                onPageChange={setPage}
              />
            </>
          );
        })()}
      </div>
    </AuditPageShell>
  );
};

export default PausedHostsPageView;
