'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HostReservationActionError,
  cancelReservationByHost,
  completeReservation,
  getReservationHistory,
  listHostReservations,
  markReservationNoShow,
  reviewReservation,
  userFacingErrorMessage,
} from '@/services/host-reservation-service';
import { useSession } from '@/lib/auth/use-session';
import type {
  IHostReservation,
  IHostReservationStats,
  IReservationHistoryEntry,
  ReservationStatus,
} from '@/types';

/* -------------------------------------------------------------------------- */
/* MF-C — inlined status-machine predicates (§4: backend enforces; web gates UI)
   Mirrors `Reservation.kt:175-209` literal `status in listOf(...)` shape.
/* -------------------------------------------------------------------------- */

const canBeReviewed = (r: IHostReservation): boolean => r.status === 'PENDING';
const canBeCompleted = (r: IHostReservation): boolean => r.status === 'CONFIRMED';
const canBeMarkedNoShow = (r: IHostReservation): boolean => r.status === 'CONFIRMED';
const canBeCancelledByHost = (r: IHostReservation): boolean =>
  r.status === 'PENDING' || r.status === 'CONFIRMED';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Q-V2-1 — 25s polling cadence while tab visible. */
const POLL_INTERVAL_MS = 25_000;

/**
 * §V1.5 C3 — client subtracts this margin from `response.serverTime` to
 * compute the next poll's `updatedSince`. MUST match
 * `HostReservationsDeltaPageDto.DEFAULT_POLL_SAFETY_MARGIN_MS` on the backend.
 */
const POLL_SAFETY_MARGIN_MS = 5_000;

const TAB_OPTIONS: { value: ReservationStatus; label: string; color: string }[] = [
  { value: 'PENDING',   label: 'Pending',     color: 'amber' },
  { value: 'CONFIRMED', label: 'Confirmed',   color: 'green' },
  { value: 'COMPLETED', label: 'Completed',   color: 'purple' },
  { value: 'CANCELLED', label: 'Cancelled',   color: 'red' },
  { value: 'NO_SHOW',   label: 'No-Show',     color: 'gray' },
  { value: 'REJECTED',  label: 'Rejected',    color: 'gray' },
];

/* -------------------------------------------------------------------------- */
/* Small presentational helpers                                                */
/* -------------------------------------------------------------------------- */

const StatusBadge: React.FC<{ status: ReservationStatus }> = ({ status }) => {
  const classes: Record<ReservationStatus, string> = {
    PENDING:   'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    REJECTED:  'bg-gray-200 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-purple-100 text-purple-800',
    NO_SHOW:   'bg-gray-200 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${classes[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const formatDateTime = (date: string, time: string): string => {
  if (!date || !time) return `${date} ${time}`.trim();
  // backend returns LocalDate (YYYY-MM-DD) + LocalTime (HH:mm:ss)
  const trimmedTime = time.length >= 5 ? time.slice(0, 5) : time;
  return `${date} · ${trimmedTime}`;
};

const formatChangedAt = (iso: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

/* -------------------------------------------------------------------------- */
/* Cancel reason prompt — small modal                                          */
/* -------------------------------------------------------------------------- */

const CancelDialog: React.FC<{
  reservationId: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}> = ({ reservationId, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [reservationId]);
  if (!reservationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Cancel reservation</h3>
        <p className="mt-1 text-sm text-gray-600">
          The customer will be notified. Please share a brief reason — this is visible to the
          customer.
        </p>
        <textarea
          className="mt-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={reason.trim().length === 0}
            onClick={() => onConfirm(reason.trim())}
          >
            Cancel reservation
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Audit-trail panel (lazy loaded on row expand)                              */
/* -------------------------------------------------------------------------- */

const AuditTrailPanel: React.FC<{
  entries: IReservationHistoryEntry[] | undefined;
  loading: boolean;
  error: string | null;
}> = ({ entries, loading, error }) => {
  if (loading) {
    return <p className="text-sm text-gray-500">Loading history…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-gray-500">No status changes recorded.</p>;
  }
  return (
    <ol className="space-y-2 border-l-2 border-gray-200 pl-4">
      {entries.map((e) => (
        <li key={e.id} className="text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {e.previousStatus ? `${e.previousStatus} → ${e.newStatus}` : `Created (${e.newStatus})`}
            </span>
            <span className="text-xs text-gray-500">by {e.changedByRole.toLowerCase()}</span>
          </div>
          <div className="text-xs text-gray-500">{formatChangedAt(e.changedAt)}</div>
          {e.reason && <div className="mt-1 text-sm text-gray-700">"{e.reason}"</div>}
        </li>
      ))}
    </ol>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const HostReservationsPage: React.FC = () => {
  const { session, isLoading: isSessionLoading } = useSession();

  const isHost = Boolean(
    session?.authenticated &&
      !session?.needsPasswordChange &&
      session.permissions.canManageBusinesses &&
      session.userType === 'HOST',
  );

  /* ---------- state --------------------------------------------------------- */
  const [reservations, setReservations] = useState<IHostReservation[]>([]);
  const [stats, setStats] = useState<IHostReservationStats | null>(null);
  const [tab, setTab] = useState<ReservationStatus>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyByReservation, setHistoryByReservation] = useState<
    Record<string, { entries?: IReservationHistoryEntry[]; loading: boolean; error: string | null }>
  >({});

  /* ---------- refs (mutable across renders without re-trigger) -------------- */
  /** Server-time anchor for the next poll's `updatedSince`. */
  const lastServerTimeRef = useRef<string | null>(null);
  /** Cancels in-flight list / poll fetches when a fresh one starts (MF4 #3). */
  const fetchControllerRef = useRef<AbortController | null>(null);
  /** Cancels in-flight history fetches when the user collapses a row. */
  const historyControllerRef = useRef<Map<string, AbortController>>(new Map());
  /** Snapshot of the previous reservations list for optimistic rollback. */
  const reservationsRef = useRef<IHostReservation[]>([]);
  reservationsRef.current = reservations;

  /* ---------- merge helper (updatedAt lexicographic stale-write guard) ----- */
  const mergeReservation = useCallback((updated: IHostReservation) => {
    setReservations((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx < 0) {
        // New row — only add if it matches the current tab filter.
        return updated.status === tab ? [updated, ...prev] : prev;
      }
      const cached = prev[idx];
      const cachedTs = cached.updatedAt ?? cached.createdAt;
      const responseTs = updated.updatedAt ?? updated.createdAt;
      // MF4 #2 lexicographic guard — ISO-8601 UTC strings sort correctly.
      if (responseTs < cachedTs) return prev;
      const next = [...prev];
      // If the row's status moved out of the current tab, drop it.
      if (updated.status !== tab) {
        next.splice(idx, 1);
      } else {
        next[idx] = updated;
      }
      return next;
    });
  }, [tab]);

  /* ---------- full / delta load -------------------------------------------- */
  const loadReservations = useCallback(async (isPolling: boolean) => {
    if (!isHost) return;

    // Cancel any in-flight fetch (MF4 #3 cancel-and-replace).
    fetchControllerRef.current?.abort();
    const ctrl = new AbortController();
    fetchControllerRef.current = ctrl;

    if (!isPolling) setIsInitialLoading(true);

    try {
      const updatedSince = isPolling && lastServerTimeRef.current
        ? new Date(new Date(lastServerTimeRef.current).getTime() - POLL_SAFETY_MARGIN_MS).toISOString()
        : undefined;

      const result = await listHostReservations(
        { status: tab, page: 0, size: 100, updatedSince },
        ctrl.signal,
      );

      // Anchor the next poll's `since` to the server's clock.
      lastServerTimeRef.current = result.serverTime;

      if (isPolling) {
        // Delta merge — preserve rows not in the response (they didn't change).
        for (const r of result.reservations) mergeReservation(r);
        setStats(result.stats);
      } else {
        setReservations(result.reservations);
        setStats(result.stats);
        setError(null);
      }
    } catch (err) {
      // Aborted fetches are expected on cancel-and-replace; swallow them.
      if (err instanceof Error && err.name === 'CanceledError') return;
      if (err instanceof HostReservationActionError) {
        if (err.code === 'since_too_old') {
          // Reset and converge to a full reload.
          lastServerTimeRef.current = null;
          await loadReservations(false);
          return;
        }
        if (!isPolling) setError(userFacingErrorMessage(err.code));
      } else if (!isPolling) {
        setError(userFacingErrorMessage('unknown_error'));
      }
    } finally {
      if (!isPolling) setIsInitialLoading(false);
    }
  }, [isHost, tab, mergeReservation]);

  /* ---------- initial load + tab change ------------------------------------ */
  useEffect(() => {
    if (isSessionLoading || !isHost) return;
    // Tab change resets the polling anchor (different filter ⇒ different rows).
    lastServerTimeRef.current = null;
    setReservations([]);
    setExpanded(null);
    void loadReservations(false);
  }, [isSessionLoading, isHost, tab, loadReservations]);

  /* ---------- 25s polling timer with Page Visibility API ------------------- */
  useEffect(() => {
    if (!isHost) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          void loadReservations(true);
        }
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        // Q-V2-2 — pause on hide.
        stop();
        // Cancel any in-flight fetch so we don't waste a response.
        fetchControllerRef.current?.abort();
      } else {
        // Resume — kick a fresh poll immediately, then restart the timer.
        void loadReservations(true);
        start();
      }
    };

    if (typeof document !== 'undefined' && !document.hidden) start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [isHost, loadReservations]);

  /* ---------- audit-trail lazy fetch on expand ----------------------------- */
  const handleToggleExpand = useCallback(async (reservationId: string) => {
    if (expanded === reservationId) {
      // Collapsing — abort any in-flight history fetch.
      historyControllerRef.current.get(reservationId)?.abort();
      historyControllerRef.current.delete(reservationId);
      setExpanded(null);
      return;
    }
    setExpanded(reservationId);
    // If we already loaded this row's history, don't re-fetch.
    if (historyByReservation[reservationId]?.entries) return;

    historyControllerRef.current.get(reservationId)?.abort();
    const ctrl = new AbortController();
    historyControllerRef.current.set(reservationId, ctrl);
    setHistoryByReservation((prev) => ({
      ...prev,
      [reservationId]: { loading: true, error: null },
    }));
    try {
      const result = await getReservationHistory(reservationId, ctrl.signal);
      setHistoryByReservation((prev) => ({
        ...prev,
        [reservationId]: { entries: result.entries, loading: false, error: null },
      }));
    } catch (err) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      const code = err instanceof HostReservationActionError ? err.code : 'unknown_error';
      setHistoryByReservation((prev) => ({
        ...prev,
        [reservationId]: { loading: false, error: userFacingErrorMessage(code) },
      }));
    }
  }, [expanded, historyByReservation]);

  /* ---------- optimistic action runner with 409 rollback + auto-refetch ---- */
  const performAction = useCallback(async (
    reservationId: string,
    optimisticStatus: ReservationStatus,
    runAction: () => Promise<IHostReservation>,
  ) => {
    if (actionInProgress) return;          // prevent double-click
    setActionInProgress(reservationId);
    setError(null);
    setInfo(null);

    const snapshot = reservationsRef.current;
    // Optimistic flip — keep the row in its current tab so the user sees
    // the change before the request returns. If `optimisticStatus` is no
    // longer in the current tab, the row drops out on the next merge.
    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, status: optimisticStatus } : r)),
    );

    try {
      const updated = await runAction();
      mergeReservation(updated);
      setInfo(null);
    } catch (err) {
      // Rollback first.
      setReservations(snapshot);

      const code = err instanceof HostReservationActionError ? err.code : 'unknown_error';
      setError(userFacingErrorMessage(code));

      // MF3 V2 — on conflict / invalid_state / not-found, refetch to converge
      // to backend truth. The backend's @Version + status precondition
      // already rejected the action; a fresh fetch is the correctness path.
      if (code === 'conflict' || code === 'invalid_state' || code === 'reservation_not_found') {
        await loadReservations(false);
      }
    } finally {
      setActionInProgress(null);
    }
  }, [actionInProgress, loadReservations, mergeReservation]);

  /* ---------- action handlers ---------------------------------------------- */
  const onApprove = useCallback((id: string) => {
    void performAction(id, 'CONFIRMED', () => reviewReservation(id, 'APPROVE'));
  }, [performAction]);

  const onReject = useCallback((id: string) => {
    void performAction(id, 'REJECTED', () => reviewReservation(id, 'REJECT'));
  }, [performAction]);

  const onComplete = useCallback((id: string) => {
    void performAction(id, 'COMPLETED', () => completeReservation(id));
  }, [performAction]);

  const onMarkNoShow = useCallback((id: string) => {
    void performAction(id, 'NO_SHOW', () => markReservationNoShow(id));
  }, [performAction]);

  const onConfirmCancel = useCallback((reason: string) => {
    if (!cancelTarget) return;
    const id = cancelTarget;
    setCancelTarget(null);
    void performAction(id, 'CANCELLED', () => cancelReservationByHost(id, reason));
  }, [cancelTarget, performAction]);

  /* ---------- render ------------------------------------------------------- */
  if (isSessionLoading || !isHost) {
    return null;                          // layout guard handles redirect
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approve, complete, or cancel customer reservations. Updates from your phone show up here within 25 seconds.
        </p>
        {stats && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {stats.pendingCount} Pending
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              {stats.confirmedCount} Confirmed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
              {stats.completedCount} Completed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
              {stats.cancelledCount} Cancelled
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
              {stats.noShowCount} No-Show
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              {stats.todayCount} Today
            </span>
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {info}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
        {TAB_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTab(opt.value)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              tab === opt.value
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => { void loadReservations(false); }}
          disabled={isInitialLoading}
        >
          {isInitialLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isInitialLoading ? (
        <p className="text-sm text-gray-500">Loading reservations…</p>
      ) : reservations.length === 0 ? (
        <p className="text-sm text-gray-500">No reservations in this tab.</p>
      ) : (
        <ul className="space-y-3">
          {reservations.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{r.contactName}</h3>
                    <StatusBadge status={r.status} />
                    {r.isEdited && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        Edited
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{formatDateTime(r.reservationDate, r.reservationTime)}</p>
                  <p className="text-sm text-gray-600">
                    {r.contactPhone} · {r.contactEmail}
                  </p>
                  {r.restaurantDetails?.partySize != null && (
                    <p className="text-sm text-gray-600">
                      Party of {r.restaurantDetails.partySize}
                      {r.restaurantDetails.seatingPreference && ` · ${r.restaurantDetails.seatingPreference}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canBeReviewed(r) && (
                    <>
                      <button
                        type="button"
                        className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onApprove(r.id)}
                        disabled={actionInProgress === r.id}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onReject(r.id)}
                        disabled={actionInProgress === r.id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {canBeCompleted(r) && (
                    <button
                      type="button"
                      className="rounded bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onComplete(r.id)}
                      disabled={actionInProgress === r.id}
                    >
                      Complete
                    </button>
                  )}
                  {canBeMarkedNoShow(r) && (
                    <button
                      type="button"
                      className="rounded border border-gray-400 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onMarkNoShow(r.id)}
                      disabled={actionInProgress === r.id}
                    >
                      No-Show
                    </button>
                  )}
                  {canBeCancelledByHost(r) && (
                    <button
                      type="button"
                      className="rounded border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => setCancelTarget(r.id)}
                      disabled={actionInProgress === r.id}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    onClick={() => { void handleToggleExpand(r.id); }}
                  >
                    {expanded === r.id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>
              {expanded === r.id && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                  {r.specialRequests && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Special requests</h4>
                      <p className="mt-1 text-sm text-gray-700">{r.specialRequests}</p>
                    </div>
                  )}
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audit trail</h4>
                  <div className="mt-2">
                    <AuditTrailPanel
                      entries={historyByReservation[r.id]?.entries}
                      loading={historyByReservation[r.id]?.loading ?? false}
                      error={historyByReservation[r.id]?.error ?? null}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CancelDialog
        reservationId={cancelTarget}
        onConfirm={onConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};

export default HostReservationsPage;
