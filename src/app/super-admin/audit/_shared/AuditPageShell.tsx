'use client';

import React from 'react';
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

export type DayBucket = { date: string; count: number };

interface AuditPageShellProps {
  title: string;
  subtitle: string;
  days: number;
  onDaysChange: (value: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
  children: React.ReactNode;
}

/** Shared header, day-window picker, refresh, and error banner for Phase 2 pages. */
export const AuditPageShell: React.FC<AuditPageShellProps> = ({
  title,
  subtitle,
  days,
  onDaysChange,
  onRefresh,
  isLoading,
  error,
  children,
}) => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link
          href="/super-admin/audit"
          className="mb-1 inline-block text-xs font-medium text-blue-600 hover:underline"
        >
          &larr; Back to Audit Log
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={String(days)}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
          <option value="365">Last year</option>
        </select>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
    {error && (
      <div className="rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )}
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, hint }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
  </div>
);

interface DailyChartProps {
  title?: string;
  data: DayBucket[];
  color?: string;
}

export const DailyChart: React.FC<DailyChartProps> = ({
  title = 'Daily Activity',
  data,
  color = '#3b82f6',
}) => {
  const chartData = data.map((d) => {
    const parsed = new Date(d.date + 'T00:00:00');
    return {
      date: parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: d.count,
    };
  });
  if (chartData.length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface BarListProps<T> {
  title: string;
  items: T[];
  labelOf: (item: T) => string;
  countOf: (item: T) => number;
  emptyHint?: string;
  color?: string;
}

export function BarList<T>({
  title,
  items,
  labelOf,
  countOf,
  emptyHint = 'No data available.',
  color = '#3b82f6',
}: BarListProps<T>) {
  const max = Math.max(...items.map(countOf), 1);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyHint}</p>
        ) : (
          items.map((item, i) => {
            const label = labelOf(item);
            const count = countOf(item);
            return (
              <div key={`${label}-${i}`} className="flex items-center gap-3">
                <span className="w-48 truncate text-xs text-gray-600" title={label}>
                  {label}
                </span>
                <div className="flex-1 rounded-full bg-gray-100">
                  <div
                    className="rounded-full py-1"
                    style={{
                      width: `${(count / max) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-medium text-gray-700">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface PaginationProps {
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  hasNext,
  isLoading,
  onPageChange,
}) => (
  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
    <button
      type="button"
      onClick={() => onPageChange(Math.max(0, page - 1))}
      disabled={page === 0 || isLoading}
      className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Previous
    </button>
    <span className="text-sm text-gray-600">Page {page + 1}</span>
    <button
      type="button"
      onClick={() => onPageChange(page + 1)}
      disabled={!hasNext || isLoading}
      className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Next
    </button>
  </div>
);

/** Format an ISO timestamp safely. Returns em-dash on null/invalid. */
export const formatTimestamp = (iso: string | null | undefined): string => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleString();
};

/** Hash-safe short render: first 10 chars + ellipsis. */
export const shortHash = (h: string | null | undefined): string =>
  h ? `${h.slice(0, 10)}\u2026` : '\u2014';

/** Convert sourceVideoId hash to a short tag for chart/table display. */
export const shortVideoId = (h: string | null | undefined): string =>
  h ? `${h.slice(0, 8)}\u2026` : '\u2014';

/** Minutes readable format for avgSessionMs. */
export const formatDurationMs = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};
