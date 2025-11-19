import axios from 'axios';
import apiClient from './api-client';
import {
  IHostApplication,
  IApplicationsPage,
  IApplicationReviewRequest,
  ApplicationStatus,
  BusinessCategory,
  PriceRange,
  IBusinessHours,
} from '@/types';

const extractIssues = (data: Record<string, unknown>): string[] => {
  const issues: string[] = [];
  const append = (value: unknown) => {
    if (typeof value === 'string') {
      issues.push(value);
    }
  };
  const candidates = [data.errors, data.details];
  candidates
    .filter((entry): entry is unknown[] => Array.isArray(entry))
    .forEach((collection) => collection.forEach(append));
  return issues;
};

class BusinessServiceError extends Error {
  status: number;
  code?: string;
  issues: string[];

  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues ?? [];
  }
}

export class ApplicationListError extends BusinessServiceError {
  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message, status, code, issues);
    this.name = 'ApplicationListError';
  }
}

export class ApplicationReviewError extends BusinessServiceError {
  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message, status, code, issues);
    this.name = 'ApplicationReviewError';
  }
}

const normalizeApplicationStatus = (value: unknown): ApplicationStatus => {
  if (typeof value !== 'string') {
    return 'PENDING';
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return 'PENDING';
};

const normalizeBusinessCategory = (value: unknown): BusinessCategory => {
  if (typeof value !== 'string') {
    return 'RESTAURANT';
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === 'HOTEL') return 'HOTEL';
  return 'RESTAURANT';
};

const normalizePriceRange = (value: unknown): PriceRange => {
  if (typeof value !== 'string') {
    return '$';
  }
  const normalized = value.trim();
  if (normalized === '$$$$') return '$$$$';
  if (normalized === '$$$') return '$$$';
  if (normalized === '$$') return '$$';
  return '$';
};

const normalizeBusinessHours = (value: unknown): IBusinessHours => {
  const defaultHours = {
    monday: 'CLOSED',
    tuesday: 'CLOSED',
    wednesday: 'CLOSED',
    thursday: 'CLOSED',
    friday: 'CLOSED',
    saturday: 'CLOSED',
    sunday: 'CLOSED',
  };

  if (typeof value !== 'object' || value === null) {
    return defaultHours;
  }

  const hours = value as Record<string, unknown>;

  // Helper function to get hours for a day (handles both uppercase and lowercase day names)
  const getHours = (dayLower: string, dayUpper: string): string => {
    if (typeof hours[dayUpper] === 'string') {
      return hours[dayUpper] as string;
    }
    if (typeof hours[dayLower] === 'string') {
      return hours[dayLower] as string;
    }
    return 'CLOSED';
  };

  return {
    monday: getHours('monday', 'MONDAY'),
    tuesday: getHours('tuesday', 'TUESDAY'),
    wednesday: getHours('wednesday', 'WEDNESDAY'),
    thursday: getHours('thursday', 'THURSDAY'),
    friday: getHours('friday', 'FRIDAY'),
    saturday: getHours('saturday', 'SATURDAY'),
    sunday: getHours('sunday', 'SUNDAY'),
  };
};

const normalizeApplication = (item: unknown): IHostApplication | null => {
  if (typeof item !== 'object' || item === null) {
    return null;
  }

  const entry = item as Record<string, unknown>;
  const applicationId = typeof entry.applicationId === 'string' ? entry.applicationId : undefined;
  const userId = typeof entry.userId === 'string' ? entry.userId : undefined;
  const username = typeof entry.username === 'string' ? entry.username : undefined;
  const email = typeof entry.email === 'string' ? entry.email : '';
  const businessName = typeof entry.businessName === 'string' ? entry.businessName : '';

  if (!applicationId || !userId || !username) {
    return null;
  }

  return {
    applicationId,
    userId,
    username,
    email,
    status: normalizeApplicationStatus(entry.status),
    businessName,
    category: normalizeBusinessCategory(entry.category),
    businessAddress: typeof entry.businessAddress === 'string' ? entry.businessAddress : '',
    phoneNumber: typeof entry.phoneNumber === 'string' ? entry.phoneNumber : '',
    priceRange: normalizePriceRange(entry.priceRange),
    businessHours: normalizeBusinessHours(entry.businessHours),
    servicesOffered: typeof entry.servicesOffered === 'string' ? entry.servicesOffered : '',
    submittedAt: typeof entry.submittedAt === 'string' ? entry.submittedAt : new Date().toISOString(),
    reviewedBy: typeof entry.reviewedBy === 'string' ? entry.reviewedBy : undefined,
    reviewedAt: typeof entry.reviewedAt === 'string' ? entry.reviewedAt : undefined,
    reviewNotes: typeof entry.reviewNotes === 'string' ? entry.reviewNotes : undefined,
  };
};

export const listHostApplications = async (
  status: ApplicationStatus = 'PENDING',
  page: number = 0,
  size: number = 20,
): Promise<IApplicationsPage> => {
  try {
    const response = await apiClient.get('/api/v1/admin/applications', {
      params: { status, page, size },
    });

    const data = response.data ?? {};
    const applications = Array.isArray(data.applications)
      ? data.applications.map(normalizeApplication).filter((app): app is IHostApplication => app !== null)
      : [];

    return {
      applications,
      page: typeof data.page === 'number' ? data.page : page,
      size: typeof data.size === 'number' ? data.size : size,
      totalElements: typeof data.totalElements === 'number' ? data.totalElements : applications.length,
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : 1,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const issues = extractIssues(responseData);
      const message =
        typeof responseData.message === 'string'
          ? responseData.message
          : 'Failed to load applications';
      throw new ApplicationListError(message, status, code, issues);
    }
    throw new ApplicationListError('Failed to load applications', 500);
  }
};

export const reviewHostApplication = async (
  applicationId: string,
  reviewRequest: IApplicationReviewRequest,
): Promise<IHostApplication> => {
  try {
    const response = await apiClient.put(
      `/api/v1/admin/applications/${applicationId}`,
      reviewRequest,
    );

    const normalized = normalizeApplication(response.data ?? {});
    if (!normalized) {
      throw new ApplicationReviewError('Received malformed response from server', 500);
    }

    return normalized;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const message =
        typeof responseData.message === 'string'
          ? responseData.message
          : 'Failed to review application';
      const issues = extractIssues(responseData);
      throw new ApplicationReviewError(message, status, code, issues);
    }
    throw new ApplicationReviewError('Failed to review application', 500);
  }
};
