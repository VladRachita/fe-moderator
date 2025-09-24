
import { IPendingVideo, IVideo, IComment, VideoStatus } from '@/types';
import apiClient from './api-client';

const isProduction = process.env.NODE_ENV === 'production';

export const getPendingVideos = async (): Promise<IPendingVideo[]> => {
  try {
    const response = await apiClient.get(`/videos/check`);
    return response.data || [];
  } catch (error) {
    if (!isProduction) {
      console.error('Failed to fetch pending videos:', error);
    }
    return [];
  }
};

export const getApprovedVideos = async (): Promise<IVideo[]> => {
  try {
    const response = await apiClient.get('/videos/approved');
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error('Failed to fetch approved videos:', error);
    }
    return [];
  }
};

export const getRejectedVideos = async (): Promise<IVideo[]> => {
  try {
    const response = await apiClient.get('/videos/rejected');
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error('Failed to fetch rejected videos:', error);
    }
    return [];
  }
};

export const getVideoById = async (id: string): Promise<IPendingVideo | null> => {
  try {
    const response = await apiClient.get(`/videos/check/${id}`);
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to fetch video with id ${id}:`, error);
    }
    return null;
  }
};

export const updateVideoStatus = async (id: string, status: VideoStatus): Promise<void> => {
  try {
    await apiClient.put(`/videos/check/${id}`, null, { params: { status } });
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to update video status for id ${id}:`, error);
    }
  }
};

export const addComment = async (id: string, comment: string): Promise<IComment | null> => {
  if (!comment || comment.trim() === '') {
    return null;
  }

  try {
    const response = await apiClient.post(`/videos/${id}/comment`, { text: comment });
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to add comment to video with id ${id}:`, error);
    }
    return null;
  }
};
