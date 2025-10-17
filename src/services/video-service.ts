
import {
  IPendingVideo,
  IModeratedVideo,
  IComment,
  IAnalyticsSummary,
  VideoStatus,
  VideoVisibility,
} from '@/types';
import apiClient from './api-client';

const isProduction = process.env.NODE_ENV === 'production';

const coerceString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeVideoType = (value: unknown): VideoVisibility | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === 'PUBLIC' || normalized === 'PRIVATE') {
    return normalized as VideoVisibility;
  }
  return value.trim() as VideoVisibility;
};

const normalizeComments = (value: unknown): IComment[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const comments = value
    .map((entry): IComment | null => {
      if (typeof entry !== 'object' || entry === null) {
        return null;
      }
      const payload = entry as Record<string, unknown>;
      const id = coerceString(payload.id ?? payload.commentId);
      const text = coerceString(payload.text ?? payload.message);
      if (!id || !text) {
        return null;
      }
      const author =
        coerceString(payload.author ?? payload.createdBy ?? payload.user ?? payload.username) ?? 'Unknown';
      return { id, text, author };
    })
    .filter((comment): comment is IComment => Boolean(comment));
  return comments.length > 0 ? comments : undefined;
};

const extractTimestamp = (payload: Record<string, unknown>): string | undefined => {
  const candidates = [
    payload.submittedAt,
    payload.createdAt,
    payload.created_at,
    payload.uploadedAt,
    payload.uploaded_at,
    payload.publishedAt,
  ];
  for (const candidate of candidates) {
    const value = coerceString(candidate);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const normalizeVideoBase = (payload: Record<string, unknown>) => {
  const id =
    coerceString(payload.id) ??
    coerceString(payload.videoId) ??
    coerceString(payload.uuid) ??
    coerceString(payload.reference);
  const title =
    coerceString(payload.title) ??
    coerceString(payload.name) ??
    coerceString(payload.filename) ??
    'Untitled video';
  const ownerId =
    coerceString(payload.ownerId) ??
    coerceString(payload.owner_id) ??
    coerceString(payload.userId) ??
    coerceString(payload.user_id);
  const ownerDisplayName =
    coerceString(payload.ownerDisplayName) ??
    coerceString(payload.ownerName) ??
    coerceString(payload.owner) ??
    coerceString(payload.uploaderName) ??
    coerceString(payload.ownerEmail);
  const ownerEmail =
    coerceString(payload.ownerEmail) ??
    coerceString(payload.owner_email) ??
    coerceString(payload.uploaderEmail);
  const videoType = normalizeVideoType(payload.videoType ?? payload.visibility ?? payload.accessLevel);
  const submittedAt = extractTimestamp(payload);
  const comments = normalizeComments(payload.comments);

  return {
    id,
    title,
    ownerId,
    ownerDisplayName,
    ownerEmail,
    videoType,
    submittedAt,
    comments,
  };
};

const normalizePendingVideo = (input: unknown): IPendingVideo | null => {
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  const payload = input as Record<string, unknown>;
  const base = normalizeVideoBase(payload);
  if (!base.id) {
    return null;
  }
  const presignedUrl =
    coerceString(payload.presignedUrl) ??
    coerceString(payload.reviewUrl) ??
    coerceString(payload.url) ??
    coerceString(payload.streamUrl);
  if (!presignedUrl) {
    return null;
  }
  return {
    ...base,
    id: base.id,
    title: base.title,
    presignedUrl,
  };
};

const normalizeStatus = (value: unknown): VideoStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === VideoStatus.APPROVED) {
    return VideoStatus.APPROVED;
  }
  if (normalized === VideoStatus.REJECTED) {
    return VideoStatus.REJECTED;
  }
  return undefined;
};

const normalizeModeratedVideo = (input: unknown): IModeratedVideo | null => {
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  const payload = input as Record<string, unknown>;
  const base = normalizeVideoBase(payload);
  if (!base.id) {
    return null;
  }
  const status =
    normalizeStatus(payload.status) ??
    normalizeStatus(payload.moderationStatus) ??
    normalizeStatus(payload.reviewStatus);
  if (!status) {
    return null;
  }
  const moderatedAt =
    coerceString(payload.moderatedAt) ??
    coerceString(payload.reviewedAt) ??
    coerceString(payload.updatedAt) ??
    coerceString(payload.updated_at);
  const moderator =
    coerceString(payload.moderator) ??
    coerceString(payload.moderatedBy) ??
    coerceString(payload.reviewer);

  return {
    ...base,
    id: base.id,
    title: base.title,
    status,
    moderatedAt,
    moderator,
  };
};

const extractVideoCollection = (responseData: unknown): unknown[] => {
  if (Array.isArray(responseData)) {
    return responseData;
  }
  if (typeof responseData === 'object' && responseData !== null) {
    const payload = responseData as Record<string, unknown>;
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
  }
  return [];
};

const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const getPendingVideos = async (): Promise<IPendingVideo[]> => {
  try {
    const response = await apiClient.get(`/api/v1/videos/check`);
    const collection = extractVideoCollection(response.data);
    return collection
      .map((item) => normalizePendingVideo(item))
      .filter((video): video is IPendingVideo => Boolean(video));
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
    const collection = extractVideoCollection(response.data);
    return collection
      .map((item) => normalizeModeratedVideo(item))
      .filter((video): video is IModeratedVideo => Boolean(video));
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
    return normalizePendingVideo(response.data) ?? null;
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
    const payload = response.data as Record<string, unknown>;
    const normalizedComment = normalizeComments([payload]);
    return normalizedComment?.[0] ?? null;
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
    const data = (response.data ?? {}) as Record<string, unknown>;
    const approvedCount =
      coerceNumber(data.approvedCount ?? data.approved_count ?? data.approved ?? data.totalApproved);
    const rejectedCount =
      coerceNumber(data.rejectedCount ?? data.rejected_count ?? data.rejected ?? data.totalRejected);
    const pendingLast24hCount = coerceNumber(
      data.pendingLast24hCount ?? data.pending_last_24h_count ?? data.pending ?? data.pending_last24,
    );
    return { approvedCount, rejectedCount, pendingLast24hCount };
  } catch (error) {
    console.error('Failed to fetch analytics summary:', error);
    throw new Error('Failed to fetch analytics summary');
  }
};
