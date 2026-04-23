'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AuditServiceError,
  getSearchEvents,
  getSearchSummary,
} from '@/services/audit-service';
import type {
  AuditPageEventsResponse,
  SearchEvent,
  SearchPageSummary,
} from '@/services/audit-service';
import { useSession } from '@/lib/auth/use-session';
import {
  AuditPageShell,
  BarList,
  DailyChart,
  formatTimestamp,
  Pagination,
  shortHash,
  StatCard,
} from '../_shared/AuditPageShell';

const PAGE_SIZE = 20;

const SearchAuditPage: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canView = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<SearchPageSummary | null>(null);
  const [events, setEvents] = useState<AuditPageEventsResponse<SearchEvent> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      setSummary(await getSearchSummary(days));
    } catch (err) {
      setError(err instanceof AuditServiceError ? err.message : 'Failed to load search summary');
    } finally {
      setLoading(false);
    }
  }, [canView, days]);

  const loadEvents = useCallback(async () => {
    if (!canView) return;
    setEventsLoading(true);
    try {
      setEvents(await getSearchEvents(days, page, PAGE_SIZE));
    } catch (err) {
      setError(err instanceof AuditServiceError ? err.message : 'Failed to load search events');
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

  const loggedTotal =
    (summary?.loggedVsAnonymous.loggedIn ?? 0) + (summary?.loggedVsAnonymous.anonymous ?? 0);
  const loggedPct =
    loggedTotal > 0
      ? Math.round(((summary?.loggedVsAnonymous.loggedIn ?? 0) / loggedTotal) * 100)
      : 0;

  return (
    <AuditPageShell
      title="Search Analytics"
      subtitle="Top keywords, tab distribution, and audience split."
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
            <StatCard label="Total searches" value={summary.totalSearches} />
            <StatCard label="Logged-in %" value={`${loggedPct}%`} hint={`${summary.loggedVsAnonymous.loggedIn.toLocaleString()} of ${loggedTotal.toLocaleString()}`} />
            <StatCard label="Distinct cities" value={summary.topCities.length} />
          </div>
          <DailyChart data={summary.dailyCounts} color="#10b981" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarList
              title="Top keywords"
              items={summary.topKeywords}
              labelOf={(k) => k.keyword || 'Unknown'}
              countOf={(k) => k.count}
              color="#10b981"
            />
            <BarList
              title="Top tabs"
              items={summary.topTabs}
              labelOf={(t) => t.tab || 'Unknown'}
              countOf={(t) => t.count}
              color="#6366f1"
            />
          </div>
          <BarList
            title="Top cities"
            items={summary.topCities}
            labelOf={(c) => c.city || 'Unknown'}
            countOf={(c) => c.count}
            color="#2563eb"
          />
        </>
      ) : loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading summary...</div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Recent search events</h2>
        {eventsLoading && !events ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading events...</div>
        ) : !events || events.events.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No events found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Time</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Keyword</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Tab</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Logged in?</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">City</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">User hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {events.events.map((e, i) => (
                    <tr key={`${e.createdAt}-${i}`}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                        {formatTimestamp(e.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{e.keyword ?? '\u2014'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{e.tab ?? '\u2014'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {e.loggedIn === null ? '\u2014' : e.loggedIn ? 'Yes' : 'No'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{e.city ?? '\u2014'}</td>
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
        )}
      </div>
    </AuditPageShell>
  );
};

export default SearchAuditPage;
