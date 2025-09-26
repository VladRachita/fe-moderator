import apiClient from './api-client';
import { IAnalyticsSummary } from '@/types';

export const getAnalyticsSummary = async (): Promise<IAnalyticsSummary> => {
  try {
    const response = await apiClient.get('/api/v1/analytics/summary');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch analytics summary:', error);
    throw new Error('Failed to fetch analytics summary');
  }
};
