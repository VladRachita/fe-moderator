
import {
  IPendingVideo,
  IModeratedVideo,
  IComment,
  IAnalyticsSummary,
  VideoStatus,
} from '@/types';
import apiClient from './api-client';

const isProduction = process.env.NODE_ENV === 'production';

export const getPendingVideos = async (): Promise<IPendingVideo[]> => {
  try {
    const response = await apiClient.get(`/api/v1/videos/check`);
    return response.data || [];
  } catch (error) {
    if (!isProduction) {
      console.error('Failed to fetch pending videos:', error);
    }
    return [];
  }
};

export const getModeratedVideos = async (status?: VideoStatus): Promise<IModeratedVideo[]> => {
  try {
    const response = await apiClient.get('/api/v1/videos/check', {
      params: status ? { status } : undefined,
    });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response.data?.items)) {
      return response.data.items;
    }
    return [];
  } catch (error) {
    if (!isProduction) {
      console.error('Failed to fetch moderated videos:', error);
    }
    return [];
  }
};

export const getVideoById = async (id: string): Promise<IPendingVideo | null> => {
  try {
    const response = await apiClient.get(`/api/v1/videos/check/${id}`);
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to fetch video with id ${id}:`, error);
    }
    return null;
  }
};


export const addComment = async (id: string, comment: string): Promise<IComment | null> => {
  if (!comment || comment.trim() === '') {
    return null;
  }

  try {
    const response = await apiClient.post(`/api/v1/videos/${id}/comment`, { text: comment });
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to add comment to video with id ${id}:`, error);
    }
    return null;
  }
};

export const updateVideoStatus = async (id: string, status: VideoStatus): Promise<void> => {
  try {
    await apiClient.put(`/api/v1/videos/check/${id}`, null, { params: { status } });
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to update video status for id ${id}:`, error);
    }
  }
};

export const getAnalyticsSummary = async (): Promise<IAnalyticsSummary> => {
  try {
    const response = await apiClient.get('/api/v1/analytics/summary');
    const { approved_count, rejected_count, pending_last_24h_count } = response.data;
    return { approvedCount: approved_count, rejectedCount: rejected_count, pendingLast24hCount: pending_last_24h_count };
  } catch (error) {
    console.error('Failed to fetch analytics summary:', error);
    throw new Error('Failed to fetch analytics summary');
  }
};
