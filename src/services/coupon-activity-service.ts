import axios from 'axios';
import apiClient from './api-client';
import { AuditServiceError } from './audit-service';

// §coupon-activity — super-admin "Coupons" dashboard service.
// Backend endpoints under /api/v1/admin/audit/pages/coupon-activity{,/coupons}
// + /inactive-coupon-hosts.
//
// PII envelope identical to paused-hosts: scope-gated to SUPER_ADMIN +
// admin:users:read; hostUserIdHash is the only on-wire user identifier
// and doubles as the drill-down correlation key.

export interface CouponActivityRow {
  hostUserIdHash: string | null;
  hostFullName: string;
  hostPhone: string;
  primaryBusinessName: string;
  primaryBusinessCategory: string;
  couponsCreated: number;
  totalRedemptions: number;
  avgUsesPerCoupon: number;
}

export interface CouponActivitySummary {
  totalHosts: number;
  totalCoupons: number;
  totalRedemptions: number;
  conversionRatePct: number;
}

export interface CouponActivityPage {
  summary: CouponActivitySummary;
  rows: CouponActivityRow[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface HostCouponItem {
  couponId: string;
  title: string;
  type: string;
  discountType: string;
  discountValue: number;
  usageCount: number;
  usageLimit: number | null;
  percentFilled: number | null;
  status: string;
  createdAt: string;
}

export interface HostCouponList {
  hostUserIdHash: string | null;
  hostFullName: string;
  coupons: HostCouponItem[];
}

export interface InactiveCouponHostRow {
  hostUserIdHash: string | null;
  hostFullName: string;
  hostPhone: string;
  primaryBusinessName: string;
  primaryBusinessCategory: string;
  lastCouponAt: string | null;
  daysSinceLastCoupon: number | null;
}

export interface InactiveCouponHostsPage {
  totalInactiveHosts: number;
  rows: InactiveCouponHostRow[];
  page: number;
  size: number;
  hasNext: boolean;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const bool = (v: unknown): boolean => v === true;

const normalizeSummary = (raw: Record<string, unknown> | undefined): CouponActivitySummary => ({
  totalHosts: num(raw?.totalHosts, 0),
  totalCoupons: num(raw?.totalCoupons, 0),
  totalRedemptions: num(raw?.totalRedemptions, 0),
  conversionRatePct: num(raw?.conversionRatePct, 0),
});

const normalizeActivityRow = (raw: Record<string, unknown>): CouponActivityRow => ({
  hostUserIdHash: strOrNull(raw.hostUserIdHash),
  hostFullName: str(raw.hostFullName),
  hostPhone: str(raw.hostPhone),
  primaryBusinessName: str(raw.primaryBusinessName),
  primaryBusinessCategory: str(raw.primaryBusinessCategory),
  couponsCreated: num(raw.couponsCreated, 0),
  totalRedemptions: num(raw.totalRedemptions, 0),
  avgUsesPerCoupon: num(raw.avgUsesPerCoupon, 0),
});

const normalizeCouponItem = (raw: Record<string, unknown>): HostCouponItem => ({
  couponId: str(raw.couponId),
  title: str(raw.title),
  type: str(raw.type),
  discountType: str(raw.discountType),
  discountValue: num(raw.discountValue, 0),
  usageCount: num(raw.usageCount, 0),
  usageLimit: numOrNull(raw.usageLimit),
  percentFilled: numOrNull(raw.percentFilled),
  status: str(raw.status),
  createdAt: str(raw.createdAt),
});

const normalizeInactiveRow = (raw: Record<string, unknown>): InactiveCouponHostRow => ({
  hostUserIdHash: strOrNull(raw.hostUserIdHash),
  hostFullName: str(raw.hostFullName),
  hostPhone: str(raw.hostPhone),
  primaryBusinessName: str(raw.primaryBusinessName),
  primaryBusinessCategory: str(raw.primaryBusinessCategory),
  lastCouponAt: strOrNull(raw.lastCouponAt),
  daysSinceLastCoupon: numOrNull(raw.daysSinceLastCoupon),
});

const extractIssues = (data: Record<string, unknown>): string[] => {
  const issues: string[] = [];
  const append = (value: unknown) => {
    if (typeof value === 'string') issues.push(value);
  };
  for (const entry of [data.errors, data.details]) {
    if (Array.isArray(entry)) entry.forEach(append);
  }
  return issues;
};

const wrapError = (err: unknown, fallbackMessage: string): AuditServiceError | Error => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 500;
    const data = (err.response?.data ?? {}) as Record<string, unknown>;
    const message = typeof data.message === 'string' ? data.message : fallbackMessage;
    return new AuditServiceError(message, status, undefined, extractIssues(data));
  }
  return err as Error;
};

export const getCouponActivity = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<CouponActivityPage> => {
  try {
    const params: Record<string, string> = {};
    if (days !== undefined) params.days = String(days);
    if (page !== undefined) params.page = String(page);
    if (size !== undefined) params.size = String(size);
    const response = await apiClient.get('/api/v1/admin/audit/pages/coupon-activity', { params });
    const data = response.data as Record<string, unknown>;
    return {
      summary: normalizeSummary(data.summary as Record<string, unknown> | undefined),
      rows: Array.isArray(data.rows)
        ? data.rows.map((r) => normalizeActivityRow(r as Record<string, unknown>))
        : [],
      page: num(data.page, 0),
      size: num(data.size, 20),
      hasNext: bool(data.hasNext),
    };
  } catch (err: unknown) {
    throw wrapError(err, 'Failed to load coupon activity');
  }
};

export const getCouponsForHost = async (
  hostUserIdHash: string,
  days: number,
): Promise<HostCouponList> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/coupon-activity/coupons', {
      params: { hostUserIdHash, days: String(days) },
    });
    const data = response.data as Record<string, unknown>;
    return {
      hostUserIdHash: strOrNull(data.hostUserIdHash),
      hostFullName: str(data.hostFullName),
      coupons: Array.isArray(data.coupons)
        ? data.coupons.map((c) => normalizeCouponItem(c as Record<string, unknown>))
        : [],
    };
  } catch (err: unknown) {
    throw wrapError(err, "Failed to load host's coupons");
  }
};

export const getInactiveCouponHosts = async (
  page?: number,
  size?: number,
): Promise<InactiveCouponHostsPage> => {
  try {
    const params: Record<string, string> = {};
    if (page !== undefined) params.page = String(page);
    if (size !== undefined) params.size = String(size);
    const response = await apiClient.get('/api/v1/admin/audit/pages/inactive-coupon-hosts', {
      params,
    });
    const data = response.data as Record<string, unknown>;
    return {
      totalInactiveHosts: num(data.totalInactiveHosts, 0),
      rows: Array.isArray(data.rows)
        ? data.rows.map((r) => normalizeInactiveRow(r as Record<string, unknown>))
        : [],
      page: num(data.page, 0),
      size: num(data.size, 20),
      hasNext: bool(data.hasNext),
    };
  } catch (err: unknown) {
    throw wrapError(err, 'Failed to load inactive coupon hosts');
  }
};
