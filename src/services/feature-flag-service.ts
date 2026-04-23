import axios from 'axios';
import apiClient from './api-client';

export interface PlatformFeatureFlag {
  flagKey: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface UpdateFeatureFlagRequest {
  flagKey: string;
  enabled: boolean;
}

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

export class FeatureFlagError extends Error {
  status: number;
  code?: string;
  issues: string[];

  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message);
    this.name = 'FeatureFlagError';
    this.status = status;
    this.code = code;
    this.issues = issues ?? [];
  }
}

const normalizeFlag = (raw: Record<string, unknown>): PlatformFeatureFlag => ({
  flagKey: typeof raw.flagKey === 'string' ? raw.flagKey : '',
  enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
  updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
});

export const getAllFlags = async (): Promise<PlatformFeatureFlag[]> => {
  try {
    const response = await apiClient.get('/api/v1/admin/feature-flags');
    const data = response.data;
    if (!Array.isArray(data)) {
      throw new FeatureFlagError('Unexpected response format', 500);
    }
    return data.map((item: Record<string, unknown>) => normalizeFlag(item));
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = (error.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to load feature flags';
      throw new FeatureFlagError(message, status, undefined, extractIssues(data));
    }
    throw error;
  }
};

export const updateFlag = async (
  request: UpdateFeatureFlagRequest,
): Promise<PlatformFeatureFlag> => {
  try {
    const response = await apiClient.put('/api/v1/admin/feature-flags', request);
    return normalizeFlag(response.data as Record<string, unknown>);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = (error.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to update feature flag';
      throw new FeatureFlagError(message, status, undefined, extractIssues(data));
    }
    throw error;
  }
};
