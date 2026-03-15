import axios from 'axios';
import apiClient from './api-client';
import type { IReportsPage, ReportStatus } from '@/types';

export class ReportServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ReportServiceError';
    this.status = status;
    this.code = code;
  }
}

export const listReports = async (
  status: ReportStatus = 'PENDING',
  page: number = 0,
  size: number = 20,
): Promise<IReportsPage> => {
  try {
    const response = await apiClient.get('/api/v1/moderation/reports', {
      params: { status, page, size },
    });
    return response.data as IReportsPage;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to load reports';
      throw new ReportServiceError(message, status, code);
    }
    throw new ReportServiceError('Failed to load reports', 500);
  }
};

export const reviewReport = async (
  reportId: string,
  status: ReportStatus,
  reviewNotes?: string,
): Promise<void> => {
  try {
    await apiClient.put(`/api/v1/moderation/reports/${reportId}`, {
      status,
      reviewNotes: reviewNotes || null,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const errStatus = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to review report';
      throw new ReportServiceError(message, errStatus, code);
    }
    throw new ReportServiceError('Failed to review report', 500);
  }
};
