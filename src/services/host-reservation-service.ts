/**
 * §V2 — HOST self-service reservation API client.
 *
 * Wraps `axios` calls to the backend's `/api/v1/business/reservations*`
 * endpoints (added in V1.5 + V2). Used by `app/host/reservations/page.tsx`
 * for list / poll / actions and by the inline-expand row for history.
 *
 * **Concurrency contract (MF4 invariants):**
 *   1. Status-helper button gating → caller's responsibility (inlined predicates)
 *   2. `updatedAt` lexicographic stale-write guard → caller compares response.updatedAt
 *      to cached row's updatedAt before applying patches in place
 *   3. `AbortController` cancel-and-replace → every list-fetch helper accepts
 *      an optional `signal: AbortSignal` and propagates to axios
 *   4. Sanitised error messages → all errors are thrown as
 *      [HostReservationActionError] with a stable `code` field; the caller
 *      uses [userFacingErrorMessage] to render human text
 *   5. Idempotency-key generation per click → action helpers accept an
 *      optional `idempotencyKey` (generated client-side via `crypto.randomUUID()`)
 *      that is logged for telemetry but NOT sent as a request header (backend
 *      doesn't enforce idempotency keys on PUT — the @Version + status
 *      precondition is the correctness mechanism). Same UUID across retries
 *      means the operator can correlate logs.
 *
 * **Polling cadence**: this module exposes `listReservations` which the page
 * polls every 25s while the tab is visible (Page Visibility API gating lives
 * in the page component, not here).
 *
 * **Sanitised error code whitelist** (caller maps to user-facing strings):
 *   - 'since_too_old'           — HTTP 400, `?updatedSince=` more than 30 days
 *                                 in the past; caller should fall back to
 *                                 a fresh full poll without `updatedSince`.
 *   - 'conflict'                — HTTP 409, optimistic-locking failure or
 *                                 status-precondition violation; caller
 *                                 should toast "modified elsewhere" + refetch.
 *   - 'invalid_state'           — HTTP 400 with a status-machine violation;
 *                                 the row's status is no longer eligible
 *                                 for this action.
 *   - 'forbidden'               — HTTP 403, scope or ownership violation;
 *                                 should not happen for a properly-scoped
 *                                 HOST session.
 *   - 'reservation_not_found'   — HTTP 404, race against another delete or
 *                                 stale local cache.
 *   - 'rate_limited'            — HTTP 429, polling cadence saturated.
 *   - 'network_error'           — generic network/timeout failure.
 *   - 'unknown_error'           — fallback.
 */

import axios from 'axios';
import apiClient from './api-client';
import type {
  ChangedByRole,
  ICancelReservationRequest,
  IHostReservation,
  IHostReservationStats,
  IHostReservationsPage,
  IHostRestaurantReservationDetails,
  IReservationHistoryEntry,
  IReservationHistoryResponse,
  IReviewReservationRequest,
  ReservationStatus,
  ReservationDecision,
} from '@/types';

export type HostReservationActionErrorCode =
  | 'since_too_old'
  | 'conflict'
  | 'invalid_state'
  | 'forbidden'
  | 'reservation_not_found'
  | 'rate_limited'
  | 'network_error'
  | 'unknown_error';

/**
 * Stable error envelope thrown by every helper in this module. The page
 * component renders [code] via [userFacingErrorMessage] — never assigns
 * `error.message` directly to UI state (MF4 invariant #4).
 */
export class HostReservationActionError extends Error {
  readonly code: HostReservationActionErrorCode;
  readonly status: number;

  constructor(code: HostReservationActionErrorCode, status: number, message: string) {
    super(message);
    this.name = 'HostReservationActionError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Maps an [HostReservationActionErrorCode] to a stable user-facing string.
 * Page components import this and never inspect raw error messages.
 */
export const userFacingErrorMessage = (code: HostReservationActionErrorCode): string => {
  switch (code) {
    case 'since_too_old':
      return 'Your dashboard has been idle for a while. Refreshing…';
    case 'conflict':
      return 'This reservation was just updated from another device. Refreshing…';
    case 'invalid_state':
      return 'This reservation is no longer in a state that allows this action.';
    case 'forbidden':
      return 'You do not have permission to manage this reservation.';
    case 'reservation_not_found':
      return 'This reservation no longer exists. Refreshing the list…';
    case 'rate_limited':
      return 'Too many requests. Please wait a moment and try again.';
    case 'network_error':
      return 'Network error. Please check your connection and try again.';
    case 'unknown_error':
    default:
      return 'Something went wrong. Please try again.';
  }
};

const VALID_RESERVATION_STATUSES = new Set<ReservationStatus>([
  'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW',
]);

const VALID_CHANGED_BY_ROLES = new Set<ChangedByRole>(['HOST', 'CUSTOMER', 'SYSTEM']);

/* -------------------------------------------------------------------------- */
/* Normalisers                                                                */
/* -------------------------------------------------------------------------- */

const normalizeStatus = (raw: unknown): ReservationStatus =>
  typeof raw === 'string' && VALID_RESERVATION_STATUSES.has(raw as ReservationStatus)
    ? (raw as ReservationStatus)
    : 'PENDING';

const normalizeChangedByRole = (raw: unknown): ChangedByRole =>
  typeof raw === 'string' && VALID_CHANGED_BY_ROLES.has(raw as ChangedByRole)
    ? (raw as ChangedByRole)
    : 'SYSTEM';

const normalizeRestaurantDetails = (
  raw: unknown,
): IHostRestaurantReservationDetails | null => {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    partySize: typeof r.partySize === 'number' ? r.partySize : null,
    seatingPreference: typeof r.seatingPreference === 'string' ? r.seatingPreference : null,
    dietaryRestrictions: typeof r.dietaryRestrictions === 'string' ? r.dietaryRestrictions : null,
    occasion: typeof r.occasion === 'string' ? r.occasion : null,
    childrenCount: typeof r.childrenCount === 'number' ? r.childrenCount : null,
  };
};

const normalizeReservation = (raw: Record<string, unknown>): IHostReservation => ({
  id: typeof raw.id === 'string' ? raw.id : '',
  customerId: typeof raw.customerId === 'string' ? raw.customerId : '',
  hostId: typeof raw.hostId === 'string' ? raw.hostId : '',
  businessId: typeof raw.businessId === 'string' ? raw.businessId : null,
  businessName: typeof raw.businessName === 'string' ? raw.businessName : '',
  businessType:
    raw.businessType === 'RESTAURANT' || raw.businessType === 'HOTEL'
      ? raw.businessType
      : 'RESTAURANT',
  status: normalizeStatus(raw.status),
  reservationDate: typeof raw.reservationDate === 'string' ? raw.reservationDate : '',
  reservationTime: typeof raw.reservationTime === 'string' ? raw.reservationTime : '',
  estimatedDurationMinutes:
    typeof raw.estimatedDurationMinutes === 'number' ? raw.estimatedDurationMinutes : null,
  contactName: typeof raw.contactName === 'string' ? raw.contactName : '',
  contactPhone: typeof raw.contactPhone === 'string' ? raw.contactPhone : '',
  contactEmail: typeof raw.contactEmail === 'string' ? raw.contactEmail : '',
  specialRequests: typeof raw.specialRequests === 'string' ? raw.specialRequests : null,
  restaurantDetails: normalizeRestaurantDetails(raw.restaurantDetails),
  reviewedAt: typeof raw.reviewedAt === 'string' ? raw.reviewedAt : null,
  reviewNotes: typeof raw.reviewNotes === 'string' ? raw.reviewNotes : null,
  cancelledAt: typeof raw.cancelledAt === 'string' ? raw.cancelledAt : null,
  cancellationReason: typeof raw.cancellationReason === 'string' ? raw.cancellationReason : null,
  couponId: typeof raw.couponId === 'string' ? raw.couponId : null,
  couponTitle: typeof raw.couponTitle === 'string' ? raw.couponTitle : null,
  createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
  updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  isEdited: typeof raw.isEdited === 'boolean' ? raw.isEdited : false,
  editedAt: typeof raw.editedAt === 'string' ? raw.editedAt : null,
  maxCapacity: typeof raw.maxCapacity === 'number' ? raw.maxCapacity : null,
});

const normalizeStats = (raw: unknown): IHostReservationStats => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    pendingCount: typeof r.pendingCount === 'number' ? r.pendingCount : 0,
    confirmedCount: typeof r.confirmedCount === 'number' ? r.confirmedCount : 0,
    completedCount: typeof r.completedCount === 'number' ? r.completedCount : 0,
    cancelledCount: typeof r.cancelledCount === 'number' ? r.cancelledCount : 0,
    noShowCount: typeof r.noShowCount === 'number' ? r.noShowCount : 0,
    todayCount: typeof r.todayCount === 'number' ? r.todayCount : 0,
  };
};

const normalizeHistoryEntry = (raw: Record<string, unknown>): IReservationHistoryEntry => ({
  id: typeof raw.id === 'string' ? raw.id : '',
  previousStatus:
    raw.previousStatus == null ? null : normalizeStatus(raw.previousStatus),
  newStatus: normalizeStatus(raw.newStatus),
  changedByRole: normalizeChangedByRole(raw.changedByRole),
  changedAt: typeof raw.changedAt === 'string' ? raw.changedAt : '',
  reason: typeof raw.reason === 'string' ? raw.reason : null,
});

/* -------------------------------------------------------------------------- */
/* Error mapping                                                              */
/* -------------------------------------------------------------------------- */

const mapAxiosErrorToCode = (err: unknown): HostReservationActionError => {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
      // The caller aborted — re-throw as-is so the page can swallow it.
      throw err;
    }
    if (err.response) {
      const data = (err.response.data ?? {}) as Record<string, unknown>;
      const status = err.response.status;
      const errorCode = typeof data.error === 'string' ? data.error : '';
      const message = typeof data.message === 'string' ? data.message : err.message;

      if (status === 400 && errorCode.startsWith('since_too_old')) {
        return new HostReservationActionError('since_too_old', status, message);
      }
      if (status === 400) {
        return new HostReservationActionError('invalid_state', status, message);
      }
      if (status === 403) {
        return new HostReservationActionError('forbidden', status, message);
      }
      if (status === 404) {
        return new HostReservationActionError('reservation_not_found', status, message);
      }
      if (status === 409) {
        return new HostReservationActionError('conflict', status, message);
      }
      if (status === 429) {
        return new HostReservationActionError('rate_limited', status, message);
      }
      return new HostReservationActionError('unknown_error', status, message);
    }
    return new HostReservationActionError('network_error', 0, err.message);
  }
  return new HostReservationActionError('unknown_error', 0, 'Unknown error');
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface ListReservationsParams {
  status?: ReservationStatus;
  date?: string;                 // ISO LocalDate
  page?: number;                 // default 0
  size?: number;                 // default 20, capped to 100 server-side
  /**
   * §V1.5 — when set, returns only reservations whose
   * `COALESCE(updated_at, created_at) > updatedSince`. Stats remain unfiltered.
   * Polling clients use the previous response's serverTime minus a safety
   * margin (5s) — see [HostReservationsDeltaPageDto] in the backend for the
   * full contract.
   */
  updatedSince?: string;         // ISO Instant
}

/**
 * Issue a single GET against the host reservations endpoint. Used by both
 * the page's first-load (no `updatedSince`) and the polling timer (with
 * `updatedSince`).
 *
 * Pass `signal` to cancel an in-flight fetch when the page unmounts, the
 * tab is hidden, or a fresh fetch is starting (MF4 invariant #3).
 */
export const listHostReservations = async (
  params: ListReservationsParams = {},
  signal?: AbortSignal,
): Promise<IHostReservationsPage> => {
  try {
    const queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.date) queryParams.date = params.date;
    if (typeof params.page === 'number') queryParams.page = params.page;
    if (typeof params.size === 'number') queryParams.size = params.size;
    if (params.updatedSince) queryParams.updatedSince = params.updatedSince;

    const response = await apiClient.get('/api/v1/business/reservations', {
      params: queryParams,
      signal,
    });
    const data = (response.data ?? {}) as Record<string, unknown>;

    const rawList = Array.isArray(data.reservations) ? data.reservations : [];
    const reservations = (rawList as Record<string, unknown>[])
      .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
      .map(normalizeReservation);

    return {
      reservations,
      page: typeof data.page === 'number' ? data.page : 0,
      size: typeof data.size === 'number' ? data.size : 20,
      totalElements: typeof data.totalElements === 'number' ? data.totalElements : reservations.length,
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : 1,
      stats: normalizeStats(data.stats),
      serverTime: typeof data.serverTime === 'string' ? data.serverTime : new Date().toISOString(),
    };
  } catch (err) {
    throw mapAxiosErrorToCode(err);
  }
};

/**
 * Lazy-load the audit trail for a single reservation when the row is
 * expanded. Cancellable via [signal] in case the user collapses the row
 * before the response arrives.
 */
export const getReservationHistory = async (
  reservationId: string,
  signal?: AbortSignal,
): Promise<IReservationHistoryResponse> => {
  try {
    const response = await apiClient.get(
      `/api/v1/business/reservations/${encodeURIComponent(reservationId)}/history`,
      { signal },
    );
    const data = (response.data ?? {}) as Record<string, unknown>;
    const rawEntries = Array.isArray(data.entries) ? data.entries : [];
    const entries = (rawEntries as Record<string, unknown>[])
      .filter((e): e is Record<string, unknown> => e != null && typeof e === 'object')
      .map(normalizeHistoryEntry);
    return {
      reservationId: typeof data.reservationId === 'string' ? data.reservationId : reservationId,
      entries,
    };
  } catch (err) {
    throw mapAxiosErrorToCode(err);
  }
};

/* -------------------------------------------------------------------------- */
/* Action helpers                                                              */
/* -------------------------------------------------------------------------- */

export interface ActionOptions {
  /**
   * Client-side correlation UUID generated per click. NOT sent as a header
   * (backend doesn't enforce idempotency keys on PUT — the @Version +
   * status-precondition guard is the correctness mechanism). Logged via
   * console.debug so an operator can correlate retries to a single click.
   */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const generateClickId = (): string => {
  // crypto.randomUUID is available in modern browsers (Next.js client) and Node 19+.
  // Fallback for older test environments.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `click_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const logAction = (action: string, reservationId: string, idempotencyKey: string): void => {
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(`[host-reservation] ${action} reservation=${reservationId} clickId=${idempotencyKey}`);
  }
};

export const reviewReservation = async (
  reservationId: string,
  decision: ReservationDecision,
  reviewNotes?: string,
  options: ActionOptions = {},
): Promise<IHostReservation> => {
  const idempotencyKey = options.idempotencyKey ?? generateClickId();
  logAction(`review:${decision}`, reservationId, idempotencyKey);
  try {
    const body: IReviewReservationRequest = { decision };
    if (reviewNotes && reviewNotes.trim().length > 0) {
      body.reviewNotes = reviewNotes.trim();
    }
    const response = await apiClient.put(
      `/api/v1/business/reservations/${encodeURIComponent(reservationId)}/review`,
      body,
      { signal: options.signal },
    );
    return normalizeReservation((response.data ?? {}) as Record<string, unknown>);
  } catch (err) {
    throw mapAxiosErrorToCode(err);
  }
};

export const completeReservation = async (
  reservationId: string,
  options: ActionOptions = {},
): Promise<IHostReservation> => {
  const idempotencyKey = options.idempotencyKey ?? generateClickId();
  logAction('complete', reservationId, idempotencyKey);
  try {
    const response = await apiClient.put(
      `/api/v1/business/reservations/${encodeURIComponent(reservationId)}/complete`,
      {},
      { signal: options.signal },
    );
    return normalizeReservation((response.data ?? {}) as Record<string, unknown>);
  } catch (err) {
    throw mapAxiosErrorToCode(err);
  }
};

export const markReservationNoShow = async (
  reservationId: string,
  options: ActionOptions = {},
): Promise<IHostReservation> => {
  const idempotencyKey = options.idempotencyKey ?? generateClickId();
  logAction('no-show', reservationId, idempotencyKey);
  try {
    const response = await apiClient.put(
      `/api/v1/business/reservations/${encodeURIComponent(reservationId)}/no-show`,
      {},
      { signal: options.signal },
    );
    return normalizeReservation((response.data ?? {}) as Record<string, unknown>);
  } catch (err) {
    throw mapAxiosErrorToCode(err);
  }
};

export const cancelReservationByHost = async (
  reservationId: string,
  reason: string,
  options: ActionOptions = {},
): Promise<IHostReservation> => {
  const idempotencyKey = options.idempotencyKey ?? generateClickId();
  logAction('cancel', reservationId, idempotencyKey);
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    // Server requires a reason; fail fast client-side with the same code
    // shape the page expects, no network round-trip needed.
    throw new HostReservationActionError(
      'invalid_state',
      400,
      'A cancellation reason is required.',
    );
  }
  try {
    const body: ICancelReservationRequest = { reason: trimmed };
    const response = await apiClient.put(
      `/api/v1/business/reservations/${encodeURIComponent(reservationId)}/cancel`,
      body,
      { signal: options.signal },
    );
    return normalizeReservation((response.data ?? {}) as Record<string, unknown>);
  } catch (err) {
    throw mapAxiosErrorToCode(err);
  }
};
