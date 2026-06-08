import axios from 'axios';
import apiClient from './api-client';
import { AuditServiceError } from './audit-service';

// §reservations-pause — super-admin "Paused HOSTs" dashboard DTOs.
// Mirrors backend PausedHostRowDto / PausedHostsPageDto field-for-field.
// Endpoint: GET /api/v1/admin/audit/pages/paused-hosts
//
// PII envelope deviation from the hash-only audit dashboard is deliberate:
// moderators need to call paused HOSTs. Scope-gated on the backend to
// SUPER_ADMIN + admin:users:read. The `hostUserIdHash` is preserved as a
// correlation key into the rest of the (hash-only) audit dashboard.

export interface PausedHostRow {
  businessId: string;
  businessName: string;
  businessCategory: string;
  hostUserIdHash: string | null;
  hostFullName: string;
  hostPhone: string;
  currentlyPaused: boolean;
  pauseStartAt: string | null;
  pauseEndAt: string | null;
}

export interface PausedHostsPage {
  rows: PausedHostRow[];
  page: number;
  size: number;
  hasNext: boolean;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown): boolean => v === true;

const normalizeRow = (raw: Record<string, unknown>): PausedHostRow => ({
  businessId: str(raw.businessId),
  businessName: str(raw.businessName),
  businessCategory: str(raw.businessCategory),
  hostUserIdHash: strOrNull(raw.hostUserIdHash),
  hostFullName: str(raw.hostFullName),
  hostPhone: str(raw.hostPhone),
  currentlyPaused: bool(raw.currentlyPaused),
  pauseStartAt: strOrNull(raw.pauseStartAt),
  pauseEndAt: strOrNull(raw.pauseEndAt),
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

export const getPausedHosts = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<PausedHostsPage> => {
  try {
    const params: Record<string, string> = {};
    if (days !== undefined) params.days = String(days);
    if (page !== undefined) params.page = String(page);
    if (size !== undefined) params.size = String(size);
    const response = await apiClient.get('/api/v1/admin/audit/pages/paused-hosts', { params });
    const data = response.data as Record<string, unknown>;
    return {
      rows: Array.isArray(data.rows)
        ? data.rows.map((r) => normalizeRow(r as Record<string, unknown>))
        : [],
      page: num(data.page, 0),
      size: num(data.size, 20),
      hasNext: bool(data.hasNext),
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      const data = (err.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to load paused hosts';
      throw new AuditServiceError(message, status, undefined, extractIssues(data));
    }
    throw err as Error;
  }
};
