import axios from 'axios';
import apiClient from './api-client';
import type {
  IAdminReservationsPage,
  IAdminReservation,
  IAdminReservationNotification,
  ReservationStatus,
  NotificationDeliveryStatus,
} from '@/types';

export class ReservationListError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ReservationListError';
    this.status = status;
    this.code = code;
  }
}

const VALID_RESERVATION_STATUSES = new Set<string>([
  'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW',
]);

const VALID_DELIVERY_STATUSES = new Set<string>([
  'ACKNOWLEDGED', 'DELIVERED', 'PENDING', 'FAILED',
]);

function normalizeDeliveryStatus(raw: unknown): NotificationDeliveryStatus {
  if (typeof raw === 'string' && VALID_DELIVERY_STATUSES.has(raw)) {
    return raw as NotificationDeliveryStatus;
  }
  return 'PENDING';
}

function normalizeReservationStatus(raw: unknown): ReservationStatus {
  if (typeof raw === 'string' && VALID_RESERVATION_STATUSES.has(raw)) {
    return raw as ReservationStatus;
  }
  return 'PENDING';
}

function normalizeNotification(raw: Record<string, unknown>): IAdminReservationNotification {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    type: typeof raw.type === 'string' ? raw.type : 'RESERVATION_CREATED',
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    title: typeof raw.title === 'string' ? raw.title : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    deliveredAt: typeof raw.deliveredAt === 'string' ? raw.deliveredAt : null,
    acknowledgedAt: typeof raw.acknowledgedAt === 'string' ? raw.acknowledgedAt : null,
    retryCount: typeof raw.retryCount === 'number' ? raw.retryCount : 0,
    lastRetryAt: typeof raw.lastRetryAt === 'string' ? raw.lastRetryAt : null,
    deliveryStatus: normalizeDeliveryStatus(raw.deliveryStatus),
  } as IAdminReservationNotification;
}

function normalizeReservation(raw: Record<string, unknown>): IAdminReservation {
  const notifications = Array.isArray(raw.notifications)
    ? (raw.notifications as Record<string, unknown>[])
        .filter((n): n is Record<string, unknown> => n != null && typeof n === 'object')
        .map(normalizeNotification)
    : [];

  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    customerId: typeof raw.customerId === 'string' ? raw.customerId : '',
    hostId: typeof raw.hostId === 'string' ? raw.hostId : '',
    businessName: typeof raw.businessName === 'string' ? raw.businessName : '',
    businessType: typeof raw.businessType === 'string' ? (raw.businessType as IAdminReservation['businessType']) : 'RESTAURANT',
    status: normalizeReservationStatus(raw.status),
    reservationDate: typeof raw.reservationDate === 'string' ? raw.reservationDate : '',
    reservationTime: typeof raw.reservationTime === 'string' ? raw.reservationTime : '',
    contactName: typeof raw.contactName === 'string' ? raw.contactName : '',
    contactEmail: typeof raw.contactEmail === 'string' ? raw.contactEmail : '',
    isEdited: typeof raw.isEdited === 'boolean' ? raw.isEdited : false,
    editedAt: typeof raw.editedAt === 'string' ? raw.editedAt : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    notifications,
  };
}

export const listAdminReservations = async (
  status?: ReservationStatus,
  editedOnly: boolean = false,
  page: number = 0,
  size: number = 20,
): Promise<IAdminReservationsPage> => {
  try {
    const params: Record<string, unknown> = { page, size };
    if (status) params.status = status;
    if (editedOnly) params.editedOnly = true;

    const response = await apiClient.get('/api/v1/admin/reservations', { params });
    const data = (response.data ?? {}) as Record<string, unknown>;

    const rawReservations = Array.isArray(data.reservations) ? data.reservations : [];
    const reservations = (rawReservations as Record<string, unknown>[])
      .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
      .map(normalizeReservation);

    const rawStats = (typeof data.stats === 'object' && data.stats != null ? data.stats : {}) as Record<string, unknown>;

    return {
      reservations,
      page: typeof data.page === 'number' ? data.page : 0,
      size: typeof data.size === 'number' ? data.size : 20,
      hasNext: typeof data.hasNext === 'boolean' ? data.hasNext : false,
      stats: {
        pendingCount: typeof rawStats.pendingCount === 'number' ? rawStats.pendingCount : 0,
        confirmedCount: typeof rawStats.confirmedCount === 'number' ? rawStats.confirmedCount : 0,
        editedCount: typeof rawStats.editedCount === 'number' ? rawStats.editedCount : 0,
        totalCount: typeof rawStats.totalCount === 'number' ? rawStats.totalCount : 0,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const errStatus = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to load reservations';
      throw new ReservationListError(message, errStatus, code);
    }
    throw new ReservationListError('Failed to load reservations', 500);
  }
};
