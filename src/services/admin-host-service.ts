import axios from 'axios';
import apiClient from './api-client';

export type HostAccountStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';

export interface IAdminHostSummary {
  hostUserId: string;
  fullName: string;
  email: string | null;
  primaryBusinessName: string;
  primaryBusinessCategory: string;
  phone: string;
  city: string | null;
  businessCount: number;
  accountStatus: HostAccountStatus;
  contentVisible: boolean;
  createdAt: string;
}

export interface IAdminHostsPage {
  hosts: IAdminHostSummary[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface IHostDisableResult {
  hostUserId: string;
  accountStatus: HostAccountStatus;
  businessesHidden: number;
  reservationsCancelled: number;
}

export class AdminHostError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AdminHostError';
    this.status = status;
    this.code = code;
  }
}

const toAdminHostError = (error: unknown, fallback: string): AdminHostError => {
  if (axios.isAxiosError(error) && error.response) {
    const data = (error.response.data ?? {}) as Record<string, unknown>;
    const message = typeof data.message === 'string' ? data.message : fallback;
    const code = typeof data.code === 'string' ? data.code : undefined;
    return new AdminHostError(message, error.response.status, code);
  }
  return new AdminHostError(fallback, 500);
};

const normalizeStatus = (value: unknown): HostAccountStatus => {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return normalized === 'DISABLED' || normalized === 'LOCKED'
    ? (normalized as HostAccountStatus)
    : 'ACTIVE';
};

const normalizeHost = (item: unknown): IAdminHostSummary | null => {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  const entry = item as Record<string, unknown>;
  const hostUserId = typeof entry.hostUserId === 'string' ? entry.hostUserId : undefined;
  if (!hostUserId) {
    return null;
  }
  return {
    hostUserId,
    fullName: typeof entry.fullName === 'string' ? entry.fullName : '(no name)',
    email: typeof entry.email === 'string' ? entry.email : null,
    primaryBusinessName:
      typeof entry.primaryBusinessName === 'string' ? entry.primaryBusinessName : '',
    primaryBusinessCategory:
      typeof entry.primaryBusinessCategory === 'string' ? entry.primaryBusinessCategory : '',
    phone: typeof entry.phone === 'string' ? entry.phone : '',
    city: typeof entry.city === 'string' ? entry.city : null,
    businessCount: typeof entry.businessCount === 'number' ? entry.businessCount : 0,
    accountStatus: normalizeStatus(entry.accountStatus),
    contentVisible: Boolean(entry.contentVisible),
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date(0).toISOString(),
  };
};

export const listAdminHosts = async (page = 0, size = 20): Promise<IAdminHostsPage> => {
  try {
    const response = await apiClient.get('/api/v1/admin/hosts', { params: { page, size } });
    const data = (response.data ?? {}) as Record<string, unknown>;
    const hosts = Array.isArray(data.hosts)
      ? data.hosts.map(normalizeHost).filter((host): host is IAdminHostSummary => Boolean(host))
      : [];
    return {
      hosts,
      page: typeof data.page === 'number' ? data.page : page,
      size: typeof data.size === 'number' ? data.size : size,
      hasNext: Boolean(data.hasNext),
    };
  } catch (error) {
    throw toAdminHostError(error, 'Failed to load hosts');
  }
};

export const disableHost = async (hostUserId: string): Promise<IHostDisableResult> => {
  try {
    const response = await apiClient.post(`/api/v1/admin/hosts/${hostUserId}/disable`);
    const data = (response.data ?? {}) as Record<string, unknown>;
    return {
      hostUserId,
      accountStatus: normalizeStatus(data.accountStatus),
      businessesHidden: typeof data.businessesHidden === 'number' ? data.businessesHidden : 0,
      reservationsCancelled:
        typeof data.reservationsCancelled === 'number' ? data.reservationsCancelled : 0,
    };
  } catch (error) {
    throw toAdminHostError(error, 'Failed to disable host');
  }
};

export const enableHost = async (hostUserId: string): Promise<void> => {
  try {
    await apiClient.post(`/api/v1/admin/hosts/${hostUserId}/enable`);
  } catch (error) {
    throw toAdminHostError(error, 'Failed to enable host');
  }
};

export const deleteHost = async (hostUserId: string): Promise<void> => {
  try {
    await apiClient.delete(`/api/v1/admin/hosts/${hostUserId}`);
  } catch (error) {
    throw toAdminHostError(error, 'Failed to delete host');
  }
};
