'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listAdminReservations,
  ReservationListError,
} from '@/services/reservation-service';
import { useSession } from '@/lib/auth/use-session';
import type { IAdminReservation, IAdminReservationStats, ReservationStatus } from '@/types';

const ReservationsPage: React.FC = () => {
  const { session, isLoading: isSessionLoading } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [reservations, setReservations] = useState<IAdminReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [reservationTab, setReservationTab] = useState<ReservationStatus | 'EDITED'>('PENDING');
  const [reservationStats, setReservationStats] = useState<IAdminReservationStats | null>(null);
  const [expandedReservationId, setExpandedReservationId] = useState<string | null>(null);
  const [reservationPage, setReservationPage] = useState(0);
  const [reservationHasNext, setReservationHasNext] = useState(false);

  const loadReservations = useCallback(async () => {
    if (!canManageUsers) return;
    setReservationsLoading(true);
    setReservationsError(null);
    try {
      const isEditedTab = reservationTab === 'EDITED';
      const statusParam = isEditedTab ? undefined : (reservationTab as ReservationStatus);
      const result = await listAdminReservations(statusParam, isEditedTab, reservationPage, 20);
      setReservations(result.reservations);
      setReservationHasNext(result.hasNext);
      setReservationStats(result.stats);
    } catch (error) {
      if (error instanceof ReservationListError) {
        setReservationsError(error.message);
      } else {
        setReservationsError('Failed to load reservations');
      }
    } finally {
      setReservationsLoading(false);
    }
  }, [canManageUsers, reservationTab, reservationPage]);

  useEffect(() => {
    if (isSessionLoading || !canManageUsers) return;
    loadReservations();
  }, [isSessionLoading, canManageUsers, loadReservations]);

  return (
    <section className="rounded-lg bg-white p-8 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Reservation Monitoring
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Track all customer reservations and their notification delivery status.
          </p>
          {reservationStats && (
            <div className="mt-2 flex gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {reservationStats.pendingCount} Pending
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                {reservationStats.confirmedCount} Confirmed
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                {reservationStats.editedCount} Edited
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                {reservationStats.completedCount} Completed
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                {reservationStats.noShowCount} No-Show
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {reservationStats.totalCount} Total
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => { void loadReservations(); }}
          disabled={reservationsLoading}
        >
          {reservationsLoading ? 'Refreshing\u2026' : 'Refresh'}
        </button>
      </div>

      {reservationsError && (
        <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {reservationsError}
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {(['PENDING', 'CONFIRMED', 'EDITED', 'COMPLETED', 'NO_SHOW'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 text-sm font-semibold transition ${
              reservationTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setReservationTab(tab);
              setReservationPage(0);
              setExpandedReservationId(null);
            }}
          >
            {tab === 'NO_SHOW' ? 'No-Show' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {reservationsLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading reservations&hellip;</div>
        ) : reservations.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No {reservationTab === 'EDITED' ? 'edited' : reservationTab === 'NO_SHOW' ? 'no-show' : reservationTab.toLowerCase()} reservations found.
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => {
              const isExpanded = expandedReservationId === reservation.id;

              return (
                <div
                  key={reservation.id}
                  className={`rounded-lg border p-5 transition ${
                    isExpanded ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {reservation.businessName}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            reservation.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-800'
                              : reservation.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : reservation.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : reservation.status === 'CANCELLED'
                                    ? 'bg-gray-200 text-gray-700'
                                    : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {reservation.status}
                        </span>
                        {reservation.isEdited && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                            Edited
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-gray-500">
                        <span>Customer: {reservation.contactName}</span>
                        <span>{reservation.contactEmail}</span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-gray-600">
                        <span>Date: {reservation.reservationDate}</span>
                        <span>Time: {reservation.reservationTime}</span>
                        <span>Created: {new Date(reservation.createdAt).toLocaleString()}</span>
                        {reservation.editedAt && (
                          <span className="text-purple-600">
                            Edited: {new Date(reservation.editedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      onClick={() =>
                        setExpandedReservationId(isExpanded ? null : reservation.id)
                      }
                    >
                      {isExpanded ? 'Hide Notifications' : `Notifications (${reservation.notifications.length})`}
                    </button>
                  </div>

                  {isExpanded && reservation.notifications.length > 0 && (
                    <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
                      <table className="min-w-full divide-y divide-gray-200 text-xs whitespace-nowrap">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Recipient</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Retries</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Created</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Delivered</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Acknowledged</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Read</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Last Retry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reservation.notifications.map((notif) => (
                            <tr key={notif.id}>
                              <td className="px-3 py-2 text-gray-900">
                                {notif.type.replace(/^RESERVATION_/, '').replace(/_/g, ' ')}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    notif.recipientRole === 'HOST'
                                      ? 'bg-blue-100 text-blue-800'
                                      : notif.recipientRole === 'CUSTOMER'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {notif.recipientRole}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    notif.deliveryStatus === 'READ'
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : notif.deliveryStatus === 'ACKNOWLEDGED'
                                        ? 'bg-green-100 text-green-800'
                                        : notif.deliveryStatus === 'DELIVERED'
                                          ? 'bg-blue-100 text-blue-800'
                                          : notif.deliveryStatus === 'FAILED'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-amber-100 text-amber-800'
                                  }`}
                                  title={
                                    notif.deliveryStatus === 'READ'
                                      ? 'Recipient tapped the push or opened the in-app inbox'
                                      : notif.deliveryStatus === 'ACKNOWLEDGED'
                                        ? 'Device accepted the FCM payload'
                                        : notif.deliveryStatus === 'DELIVERED'
                                          ? 'Push reached the device'
                                          : undefined
                                  }
                                >
                                  {notif.deliveryStatus}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-700">{notif.retryCount}/3</td>
                              <td className="px-3 py-2 text-gray-700">
                                {new Date(notif.createdAt).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {notif.deliveredAt
                                  ? new Date(notif.deliveredAt).toLocaleString()
                                  : '\u2014'}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {notif.acknowledgedAt
                                  ? new Date(notif.acknowledgedAt).toLocaleString()
                                  : '\u2014'}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {notif.readAt
                                  ? new Date(notif.readAt).toLocaleString()
                                  : '\u2014'}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {notif.lastRetryAt
                                  ? new Date(notif.lastRetryAt).toLocaleString()
                                  : '\u2014'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isExpanded && reservation.notifications.length === 0 && (
                    <div className="mt-4 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                      No notifications sent for this reservation.
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setReservationPage((prev) => Math.max(0, prev - 1))}
                disabled={reservationPage === 0}
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {reservationPage + 1}</span>
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setReservationPage((prev) => prev + 1)}
                disabled={!reservationHasNext}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReservationsPage;
