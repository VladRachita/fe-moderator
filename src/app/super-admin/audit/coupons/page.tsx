'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditServiceError } from '@/services/audit-service';
import {
  getCouponActivity,
  getCouponsForHost,
  getInactiveCouponHosts,
  type CouponActivityPage,
  type CouponActivityRow,
  type HostCouponItem,
  type HostCouponList,
  type InactiveCouponHostRow,
  type InactiveCouponHostsPage,
} from '@/services/coupon-activity-service';
import { useSession } from '@/lib/auth/use-session';
import {
  AuditPageShell,
  BarList,
  formatTimestamp,
  Pagination,
  shortHash,
  StatCard,
} from '../_shared/AuditPageShell';

const PAGE_SIZE = 20;
const TAB1_DAY_OPTIONS = [1, 2, 3, 5, 7, 10];
const TOP_HOSTS_BARLIST_LIMIT = 10;

type ActiveTab = 'active' | 'inactive';

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      active
        ? 'border-b-2 border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700'
        : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900'
    }
  >
    {label}
  </button>
);

const formatPhone = (phone: string): React.ReactNode =>
  phone ? (
    <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
      {phone}
    </a>
  ) : (
    '—'
  );

const CouponsAuditPage: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canView = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [tab, setTab] = useState<ActiveTab>('active');

  // Tab 1 — active hosts
  const [days, setDays] = useState(7);
  const [activePage, setActivePage] = useState(0);
  const [activeResp, setActiveResp] = useState<CouponActivityPage | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Tab 1 — drill-down
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<HostCouponList | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);

  // Tab 2 — inactive hosts
  const [inactivePage, setInactivePage] = useState(0);
  const [inactiveResp, setInactiveResp] = useState<InactiveCouponHostsPage | null>(null);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [inactiveError, setInactiveError] = useState<string | null>(null);

  // §Stale-write guard — capture {days, activePage} at fetch start and no-op
  // if either has changed before the response lands. Same shape applied to
  // loadInactive + the drill-down useEffect below.
  const loadActive = useCallback((): (() => void) | void => {
    if (!canView || tab !== 'active') return;
    const requestedDays = days;
    const requestedPage = activePage;
    let cancelled = false;
    setActiveLoading(true);
    setActiveError(null);
    void getCouponActivity(requestedDays, requestedPage, PAGE_SIZE)
      .then((d) => {
        if (cancelled || requestedDays !== days || requestedPage !== activePage) return;
        setActiveResp(d);
      })
      .catch((err) => {
        if (cancelled || requestedDays !== days || requestedPage !== activePage) return;
        setActiveError(
          err instanceof AuditServiceError ? err.message : 'Failed to load coupon activity',
        );
      })
      .finally(() => {
        if (!cancelled) setActiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, tab, days, activePage]);

  const loadInactive = useCallback((): (() => void) | void => {
    if (!canView || tab !== 'inactive') return;
    const requestedPage = inactivePage;
    let cancelled = false;
    setInactiveLoading(true);
    setInactiveError(null);
    void getInactiveCouponHosts(requestedPage, PAGE_SIZE)
      .then((d) => {
        if (cancelled || requestedPage !== inactivePage) return;
        setInactiveResp(d);
      })
      .catch((err) => {
        if (cancelled || requestedPage !== inactivePage) return;
        setInactiveError(
          err instanceof AuditServiceError ? err.message : 'Failed to load inactive hosts',
        );
      })
      .finally(() => {
        if (!cancelled) setInactiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, tab, inactivePage]);

  useEffect(() => loadActive(), [loadActive, identityVersion]);
  useEffect(() => loadInactive(), [loadInactive, identityVersion]);

  // Reset paging when scope changes
  useEffect(() => {
    setActivePage(0);
  }, [days]);

  // Reset drill-down when scope changes (orthogonal-change guard)
  useEffect(() => {
    setExpandedHash(null);
    setDrillData(null);
    setDrillError(null);
  }, [tab, days, activePage]);

  // §Stale-write guard — drill-down: clicking host A then host B before
  // fetch-A resolves must NOT let fetch-A overwrite fetch-B's data.
  useEffect(() => {
    if (!expandedHash) {
      setDrillData(null);
      setDrillError(null);
      return;
    }
    const requested = expandedHash;
    let cancelled = false;
    setDrillLoading(true);
    setDrillError(null);
    setDrillData(null);
    void getCouponsForHost(requested, days)
      .then((d) => {
        if (!cancelled && requested === expandedHash) setDrillData(d);
      })
      .catch((err) => {
        if (!cancelled && requested === expandedHash) {
          setDrillError(
            err instanceof AuditServiceError ? err.message : 'Failed to load coupons',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDrillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedHash, days]);

  const topHosts = useMemo<CouponActivityRow[]>(
    () => (activeResp?.rows ?? []).slice(0, TOP_HOSTS_BARLIST_LIMIT),
    [activeResp],
  );

  if (isSessionLoading || !canView) return null;

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="Active HOSTs" />
        <TabButton
          active={tab === 'inactive'}
          onClick={() => setTab('inactive')}
          label="Inactive HOSTs (30d)"
        />
      </div>

      {tab === 'active' ? (
        <AuditPageShell
          title="Coupon activity — active HOSTs"
          subtitle="HOSTs creating coupons in the selected window. See your top creators and the ones losing steam."
          days={days}
          dayOptions={TAB1_DAY_OPTIONS}
          onDaysChange={setDays}
          onRefresh={() => loadActive()}
          isLoading={activeLoading}
          error={activeError}
        >
          <ActiveHostsBody
            response={activeResp}
            loading={activeLoading}
            topHosts={topHosts}
            expandedHash={expandedHash}
            onExpand={(hash) =>
              setExpandedHash((prev) => (prev === hash ? null : hash))
            }
            drillData={drillData}
            drillLoading={drillLoading}
            drillError={drillError}
            page={activePage}
            onPageChange={setActivePage}
          />
        </AuditPageShell>
      ) : (
        <AuditPageShell
          title="Coupon activity — inactive HOSTs"
          subtitle="HOSTs with at least one business who created zero coupons in the last 30 days. Reach out to help them get started."
          days={30}
          dayOptions={[30]}
          onDaysChange={() => {
            /* fixed window */
          }}
          onRefresh={() => loadInactive()}
          isLoading={inactiveLoading}
          error={inactiveError}
        >
          <InactiveHostsBody
            response={inactiveResp}
            loading={inactiveLoading}
            page={inactivePage}
            onPageChange={setInactivePage}
          />
        </AuditPageShell>
      )}
    </div>
  );
};

interface ActiveHostsBodyProps {
  response: CouponActivityPage | null;
  loading: boolean;
  topHosts: CouponActivityRow[];
  expandedHash: string | null;
  onExpand: (hash: string) => void;
  drillData: HostCouponList | null;
  drillLoading: boolean;
  drillError: string | null;
  page: number;
  onPageChange: (page: number) => void;
}

const ActiveHostsBody: React.FC<ActiveHostsBodyProps> = ({
  response,
  loading,
  topHosts,
  expandedHash,
  onExpand,
  drillData,
  drillLoading,
  drillError,
  page,
  onPageChange,
}) => {
  const summary = response?.summary;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active HOSTs" value={summary?.totalHosts ?? 0} />
        <StatCard label="Coupons created" value={summary?.totalCoupons ?? 0} />
        <StatCard label="Total redemptions" value={summary?.totalRedemptions ?? 0} />
        <StatCard
          label="Conversion rate"
          value={`${(summary?.conversionRatePct ?? 0).toFixed(2)}%`}
          hint="total redemptions / total coupons"
        />
      </div>

      <BarList<CouponActivityRow>
        title={`Top ${TOP_HOSTS_BARLIST_LIMIT} HOSTs by coupons created`}
        items={topHosts}
        labelOf={(r) => r.hostFullName || r.primaryBusinessName || shortHash(r.hostUserIdHash)}
        countOf={(r) => r.couponsCreated}
        emptyHint="No coupons created in this window."
      />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Per-HOST activity</h2>
        {(() => {
          if (loading && !response) {
            return <div className="py-12 text-center text-sm text-gray-500">Loading...</div>;
          }
          if (!response || response.rows.length === 0) {
            return (
              <div className="py-12 text-center text-sm text-gray-500">
                No HOSTs created coupons in this window.
              </div>
            );
          }
          return (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-6 px-2 py-2" />
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">HOST name</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Business</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Coupons</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">
                        Redemptions
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">
                        Avg uses/coupon
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Host hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {response.rows.map((r) => {
                      const isExpanded = r.hostUserIdHash !== null && expandedHash === r.hostUserIdHash;
                      const canExpand = r.hostUserIdHash !== null;
                      return (
                        <React.Fragment key={r.hostUserIdHash ?? `${r.hostFullName}-${r.primaryBusinessName}`}>
                          <tr
                            className={canExpand ? 'cursor-pointer hover:bg-gray-50' : ''}
                            onClick={() => {
                              if (canExpand && r.hostUserIdHash) onExpand(r.hostUserIdHash);
                            }}
                          >
                            <td className="px-2 py-2 text-xs text-gray-500">
                              {canExpand ? (isExpanded ? '▾' : '▸') : ''}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-gray-900">
                              {r.hostFullName || '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-700">
                              {r.primaryBusinessName || '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-700">
                              {r.primaryBusinessCategory || '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-xs text-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formatPhone(r.hostPhone)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                              {r.couponsCreated.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-gray-700">
                              {r.totalRedemptions.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-gray-700">
                              {r.avgUsesPerCoupon.toFixed(2)}
                            </td>
                            <td
                              className="px-3 py-2 font-mono text-xs text-gray-500"
                              title={r.hostUserIdHash ?? ''}
                            >
                              {shortHash(r.hostUserIdHash)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50">
                              <td colSpan={9} className="px-3 py-3">
                                <DrillDownPanel
                                  loading={drillLoading}
                                  error={drillError}
                                  data={drillData}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={response.page}
                hasNext={response.hasNext}
                isLoading={loading}
                onPageChange={onPageChange}
              />
            </>
          );
        })()}
      </div>
    </>
  );
};

const DrillDownPanel: React.FC<{
  loading: boolean;
  error: string | null;
  data: HostCouponList | null;
}> = ({ loading, error, data }) => {
  if (loading) {
    return <div className="py-3 text-center text-xs text-gray-500">Loading coupons...</div>;
  }
  if (error) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
        {error}
      </div>
    );
  }
  if (!data || data.coupons.length === 0) {
    return <div className="py-3 text-center text-xs text-gray-500">No coupons to show.</div>;
  }
  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-white">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Discount</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">Usage</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">% filled</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.coupons.map((c: HostCouponItem) => {
            const discountLabel =
              c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : c.discountValue.toString();
            const usageLabel =
              c.usageLimit !== null && c.usageLimit !== undefined
                ? `${c.usageCount} / ${c.usageLimit}`
                : `${c.usageCount}`;
            return (
              <tr key={c.couponId}>
                <td className="px-3 py-2 text-gray-900">{c.title || '—'}</td>
                <td className="px-3 py-2 text-gray-700">{c.type}</td>
                <td className="px-3 py-2 text-gray-700">{discountLabel}</td>
                <td className="px-3 py-2 text-right text-gray-700">{usageLabel}</td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {c.percentFilled !== null && c.percentFilled !== undefined
                    ? `${c.percentFilled.toFixed(1)}%`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-gray-700">{c.status}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                  {formatTimestamp(c.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface InactiveHostsBodyProps {
  response: InactiveCouponHostsPage | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

const InactiveHostsBody: React.FC<InactiveHostsBodyProps> = ({
  response,
  loading,
  page,
  onPageChange,
}) => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Inactive HOSTs (last 30 days)"
        value={response?.totalInactiveHosts ?? 0}
        hint="zero coupons created in the last 30 days"
      />
    </div>

    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Reach-out list</h2>
      {(() => {
        if (loading && !response) {
          return <div className="py-12 text-center text-sm text-gray-500">Loading...</div>;
        }
        if (!response || response.rows.length === 0) {
          return (
            <div className="py-12 text-center text-sm text-gray-500">
              Every HOST has created at least one coupon in the last 30 days. Nothing to follow up on right now.
            </div>
          );
        }
        return (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">HOST name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Business</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Last coupon</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Days since</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Host hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {response.rows.map((r: InactiveCouponHostRow) => {
                    const lastLabel = r.lastCouponAt
                      ? formatTimestamp(r.lastCouponAt)
                      : 'Never';
                    const daysLabel = r.daysSinceLastCoupon !== null
                      ? `${r.daysSinceLastCoupon}d`
                      : '—';
                    return (
                      <tr key={r.hostUserIdHash ?? `${r.hostFullName}-${r.primaryBusinessName}`}>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {r.hostFullName || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {r.primaryBusinessName || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {r.primaryBusinessCategory || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{formatPhone(r.hostPhone)}</td>
                        <td
                          className={
                            r.lastCouponAt
                              ? 'whitespace-nowrap px-3 py-2 text-xs text-gray-700'
                              : 'whitespace-nowrap px-3 py-2 text-xs italic text-gray-500'
                          }
                        >
                          {lastLabel}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-700">{daysLabel}</td>
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
              onPageChange={onPageChange}
            />
          </>
        );
      })()}
    </div>
  </>
);

export default CouponsAuditPage;
