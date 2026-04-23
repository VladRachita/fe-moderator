'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getAuditSummary,
  getAuditEvents,
  getReservationsSummary,
  AuditServiceError,
} from '@/services/audit-service';
import type {
  AuditSummary,
  AuditEvent,
  ReservationsPageSummary,
} from '@/services/audit-service';
import { useSession } from '@/lib/auth/use-session';
import { StatCard } from './_shared/AuditPageShell';

const UA_CLASS_COLORS: Record<string, string> = {
  ANDROID: '#10b981',
  IOS: '#6366f1',
  DESKTOP: '#f59e0b',
  BOT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const HIDDEN_EVENT_TYPES = new Set<string>([
  'SESSION_LOOKUP',
  'AUTHORIZATION_CODE_ISSUED',
  'TOKEN_ISSUED',
  'TOKEN_REFRESHED',
]);

type AuditPageCard = {
  label: string;
  description: string;
  href: string;
  accent: string;
};

const AUDIT_PAGE_CARDS: AuditPageCard[] = [
  {
    label: 'Feed',
    description: 'Swipe volume, role split, city breakdown, drop-off funnel.',
    href: '/super-admin/audit/feed',
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    label: 'Search',
    description: 'Top keywords, tabs, logged-in vs anonymous, city mix.',
    href: '/super-admin/audit/search',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Video Upload',
    description: 'Uploads by city and daily activity.',
    href: '/super-admin/audit/video-upload',
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    label: 'Registration',
    description: 'New signups, city mix, age buckets.',
    href: '/super-admin/audit/registration',
    accent: 'bg-violet-50 text-violet-700',
  },
  {
    label: 'Reservations',
    description: 'Conversions from video, top source videos.',
    href: '/super-admin/audit/reservations',
    accent: 'bg-rose-50 text-rose-700',
  },
];

const AuditPage: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  // Summary state
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Reservations overview (inline on this page; drill-in lives under /reservations)
  const [reservations, setReservations] = useState<ReservationsPageSummary | null>(null);
  const [reservationsError, setReservationsError] = useState<string | null>(null);

  // Events state
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsHasNext, setEventsHasNext] = useState(false);

  // Filters
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [filterUaClass, setFilterUaClass] = useState<string>('');
  const [filterSize, setFilterSize] = useState<number>(20);

  // Details expand
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!canManageUsers) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setReservationsError(null);
    const [summaryResult, reservationsResult] = await Promise.allSettled([
      getAuditSummary(30),
      getReservationsSummary(30),
    ]);
    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value);
    } else {
      const reason = summaryResult.reason;
      setSummaryError(
        reason instanceof AuditServiceError ? reason.message : 'Failed to load audit summary',
      );
    }
    if (reservationsResult.status === 'fulfilled') {
      setReservations(reservationsResult.value);
    } else {
      const reason = reservationsResult.reason;
      // Don't block the overview on reservations — render everything else.
      setReservationsError(
        reason instanceof AuditServiceError
          ? reason.message
          : 'Failed to load reservations summary',
      );
    }
    setSummaryLoading(false);
  }, [canManageUsers]);

  const loadEvents = useCallback(async () => {
    if (!canManageUsers) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const data = await getAuditEvents({
        eventType: filterEventType || undefined,
        uaClass: filterUaClass || undefined,
        page: eventsPage,
        size: filterSize,
      });
      setEvents(data.events);
      setEventsHasNext(data.hasNext);
    } catch (err) {
      if (err instanceof AuditServiceError) {
        setEventsError(err.message);
      } else {
        setEventsError('Failed to load audit events');
      }
    } finally {
      setEventsLoading(false);
    }
  }, [canManageUsers, filterEventType, filterUaClass, eventsPage, filterSize]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, identityVersion]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, identityVersion]);

  // Reset page when filters change
  useEffect(() => {
    setEventsPage(0);
  }, [filterEventType, filterUaClass, filterSize]);

  if (isSessionLoading || !canManageUsers) {
    return null;
  }

  const chartData = (summary?.dailyCounts ?? []).map((d) => {
    const parsed = new Date(d.date + 'T00:00:00');
    return {
      date: parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: d.count,
    };
  });

  const visibleEventsByType = (summary?.eventsByType ?? []).filter(
    ({ eventType }) => !HIDDEN_EVENT_TYPES.has(eventType),
  );

  const maxTypeCount = Math.max(
    ...visibleEventsByType.map((e) => e.count),
    1,
  );

  const maxUaCount = Math.max(
    ...(summary?.eventsByUaClass ?? []).map((e) => e.count),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform-wide event audit trail with pseudonymised identifiers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadSummary();
            void loadEvents();
          }}
          disabled={summaryLoading || eventsLoading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {summaryLoading || eventsLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Reservations overview (drill-in lives under /super-admin/audit/reservations) */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Reservations overview (last 30 days)
          </h2>
          <Link
            href="/super-admin/audit/reservations"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Open full dashboard &rarr;
          </Link>
        </div>
        {reservationsError ? (
          <div className="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {reservationsError}
          </div>
        ) : reservations ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total reservations" value={reservations.totalReservations} />
            <StatCard label="From a video" value={reservations.fromVideoCount} />
            <StatCard
              label="Video conversion rate"
              value={`${reservations.conversionRatePct.toFixed(1)}%`}
            />
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-gray-500">
            Loading reservations overview...
          </div>
        )}
      </div>

      {/* Drill-in cards for per-page dashboards */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Per-page Analytics</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIT_PAGE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-2 rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 hover:shadow-sm"
            >
              <span
                className={`inline-block w-fit rounded px-2 py-0.5 text-xs font-semibold ${card.accent}`}
              >
                {card.label}
              </span>
              <p className="text-sm text-gray-600 group-hover:text-gray-900">
                {card.description}
              </p>
              <span className="mt-auto text-xs font-medium text-blue-600 group-hover:underline">
                Open dashboard &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>

      {summaryError && (
        <div className="rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {summaryError}
        </div>
      )}

      {/* Stats row */}
      {summaryLoading && !summary ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading summary...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalEvents.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-sm text-gray-500">Unique IPs</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.uniqueIpHashes.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-sm text-gray-500">Event Types Tracked</p>
              <p className="text-2xl font-bold text-gray-900">
                {visibleEventsByType.length}
              </p>
            </div>
          </div>

          {/* Daily activity chart */}
          {chartData.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Daily Activity</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribution panels */}
          <div className="grid grid-cols-2 gap-4">
            {/* Events by type */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Events by Type</h2>
              <div className="space-y-2">
                {visibleEventsByType.length === 0 ? (
                  <p className="text-sm text-gray-500">No data available.</p>
                ) : (
                  visibleEventsByType.map(({ eventType, count }) => (
                    <div key={eventType} className="flex items-center gap-3">
                      <span className="w-48 truncate text-xs text-gray-600">
                        {eventType.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 rounded-full bg-gray-100">
                        <div
                          className="rounded-full bg-blue-500 py-1"
                          style={{ width: `${(count / maxTypeCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-medium text-gray-700">
                        {count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Device classes */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Device Classes</h2>
              <div className="space-y-2">
                {summary.eventsByUaClass.length === 0 ? (
                  <p className="text-sm text-gray-500">No data available.</p>
                ) : (
                  summary.eventsByUaClass.map(({ uaClass, count }) => (
                    <div key={uaClass} className="flex items-center gap-3">
                      <span className="w-48 truncate text-xs text-gray-600">
                        {uaClass}
                      </span>
                      <div className="flex-1 rounded-full bg-gray-100">
                        <div
                          className="rounded-full py-1"
                          style={{
                            width: `${(count / maxUaCount) * 100}%`,
                            backgroundColor: UA_CLASS_COLORS[uaClass] ?? '#3b82f6',
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-medium text-gray-700">
                        {count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Events table section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Event Log</h2>

        {/* Filters */}
        <div className="mb-4 flex items-center gap-3">
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All event types</option>
            {visibleEventsByType.map(({ eventType }) => (
              <option key={eventType} value={eventType}>
                {eventType.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            value={filterUaClass}
            onChange={(e) => setFilterUaClass(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All device classes</option>
            {(summary?.eventsByUaClass ?? []).map(({ uaClass }) => (
              <option key={uaClass} value={uaClass}>
                {uaClass}
              </option>
            ))}
          </select>

          <select
            value={String(filterSize)}
            onChange={(e) => setFilterSize(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>

        {eventsError && (
          <div className="mb-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {eventsError}
          </div>
        )}

        {eventsLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Event Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">User ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">UA Class</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">IP Hash</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => {
                  const isExpanded = expandedEventId === event.id;
                  return (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                        {event.userId ? `${event.userId.slice(0, 8)}...` : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {event.uaClass ?? '\u2014'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                        {event.ipHash ? `${event.ipHash.slice(0, 12)}...` : '\u2014'}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        {event.details ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEventId(isExpanded ? null : event.id)
                            }
                            className="text-left"
                          >
                            <code className="block rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
                              {isExpanded
                                ? event.details
                                : event.details.length > 60
                                  ? `${event.details.slice(0, 60)}...`
                                  : event.details}
                            </code>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">{'\u2014'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!eventsLoading && events.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setEventsPage((p) => Math.max(0, p - 1))}
              disabled={eventsPage === 0}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {eventsPage + 1}</span>
            <button
              type="button"
              onClick={() => setEventsPage((p) => p + 1)}
              disabled={!eventsHasNext}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPage;
