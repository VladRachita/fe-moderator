'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AuditServiceError,
  getReservationsEvents,
  getReservationsSummary,
} from '@/services/audit-service';
import type {
  AuditPageEventsResponse,
  ReservationsEvent,
  ReservationsPageSummary,
} from '@/services/audit-service';
import { useSession } from '@/lib/auth/use-session';
import {
  AuditPageShell,
  BarList,
  DailyChart,
  formatTimestamp,
  Pagination,
  shortHash,
  shortVideoId,
  StatCard,
} from '../_shared/AuditPageShell';

const PAGE_SIZE = 20;

// §category-update M10 — businessType filter chip values. The 'ALL' sentinel
// is rendered as "All" and short-circuits the client-side filter. Order mirrors
// CATEGORY_ORDER on /super-admin/categories so the dropdown reads consistently.
const BUSINESS_TYPE_FILTER_OPTIONS = ['ALL', 'RESTAURANT', 'SERVICE', 'STAY'] as const;
type BusinessTypeFilter = (typeof BUSINESS_TYPE_FILTER_OPTIONS)[number];

const ReservationsAuditPage: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canView = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ReservationsPageSummary | null>(null);
  const [events, setEvents] = useState<AuditPageEventsResponse<ReservationsEvent> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // §category-update M10 — purely client-side filter; backend already projects
  // `businessType` per row (audit-service.ts:289). No new endpoint required.
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BusinessTypeFilter>('ALL');

  const loadSummary = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      setSummary(await getReservationsSummary(days));
    } catch (err) {
      setError(
        err instanceof AuditServiceError ? err.message : 'Failed to load reservations summary',
      );
    } finally {
      setLoading(false);
    }
  }, [canView, days]);

  const loadEvents = useCallback(async () => {
    if (!canView) return;
    setEventsLoading(true);
    try {
      setEvents(await getReservationsEvents(days, page, PAGE_SIZE));
    } catch (err) {
      setError(
        err instanceof AuditServiceError ? err.message : 'Failed to load reservations events',
      );
    } finally {
      setEventsLoading(false);
    }
  }, [canView, days, page]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary, identityVersion]);
  useEffect(() => {
    void loadEvents();
  }, [loadEvents, identityVersion]);
  useEffect(() => {
    setPage(0);
  }, [days]);

  if (isSessionLoading || !canView) return null;

  return (
    <AuditPageShell
      title="Reservations Analytics"
      subtitle="Conversion from video plays to bookings and top source videos."
      days={days}
      onDaysChange={setDays}
      onRefresh={() => {
        void loadSummary();
        void loadEvents();
      }}
      isLoading={loading || eventsLoading}
      error={error}
    >
      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total reservations" value={summary.totalReservations} />
            <StatCard label="From a video" value={summary.fromVideoCount} />
            <StatCard
              label="Video conversion rate"
              value={`${summary.conversionRatePct.toFixed(1)}%`}
            />
          </div>
          <DailyChart data={summary.dailyCounts} color="#ef4444" />
          <BarList
            title="Top source videos"
            items={summary.topSourceVideos}
            labelOf={(v) => shortVideoId(v.sourceVideoId)}
            countOf={(v) => v.count}
            color="#ef4444"
          />
        </>
      ) : loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading summary...</div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Recent reservations</h2>
          {/* \u00a7category-update M10 \u2014 businessType filter chip. Client-side only;
              backend already returns businessType per row. */}
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">Business type</span>
            <select
              data-testid="business-type-filter"
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 shadow-sm focus:border-gray-500 focus:outline-none"
              value={businessTypeFilter}
              onChange={(e) => setBusinessTypeFilter(e.target.value as BusinessTypeFilter)}
            >
              {BUSINESS_TYPE_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'ALL' ? 'All' : opt}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(() => {
          const filteredEvents =
            businessTypeFilter === 'ALL'
              ? events?.events ?? []
              : (events?.events ?? []).filter((e) => e.businessType === businessTypeFilter);

          if (eventsLoading && !events) {
            return <div className="py-12 text-center text-sm text-gray-500">Loading events...</div>;
          }
          if (!events || events.events.length === 0) {
            return <div className="py-12 text-center text-sm text-gray-500">No events found.</div>;
          }
          if (filteredEvents.length === 0) {
            return (
              <div className="py-12 text-center text-sm text-gray-500">
                No events match the selected business type.
              </div>
            );
          }
          return (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Time</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Business type</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Source video</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Host hash</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">User hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEvents.map((e, i) => (
                      <tr key={`${e.createdAt}-${i}`}>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                          {formatTimestamp(e.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {e.businessType ?? '\u2014'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">
                          {shortVideoId(e.sourceVideoIdHash)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">
                          {shortHash(e.hostIdHash)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">
                          {shortHash(e.userIdHash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={events.page}
                hasNext={events.hasNext}
                isLoading={eventsLoading}
                onPageChange={setPage}
              />
            </>
          );
        })()}
      </div>
    </AuditPageShell>
  );
};

export default ReservationsAuditPage;
