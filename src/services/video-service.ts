
import { IPendingVideo, IVideo, IComment } from '@/types';
import apiClient from './api-client';

const isProduction = process.env.NODE_ENV === 'production';

export const getPendingVideos = async (page: number): Promise<IPendingVideo[]> => {
  try {
    const response = await apiClient.get(`/videos/check?page=${page}`);
    return response.data;
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
    const response = await apiClient.get(`/videos/${id}`);
    return response.data;
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to fetch video with id ${id}:`, error);
    }
    return null;
  }
};

export const approveVideo = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/videos/${id}/approve`);
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to approve video with id ${id}:`, error);
    }
  }
};

export const rejectVideo = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/videos/${id}/reject`);
  } catch (error) {
    if (!isProduction) {
      console.error(`Failed to reject video with id ${id}:`, error);
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
