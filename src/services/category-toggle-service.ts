import axios from 'axios';
import apiClient from './api-client';

export interface CategoryToggle {
  category: string;
  subcategory: string | null;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface UpdateToggleRequest {
  category: string;
  subcategory: string | null;
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

export class CategoryToggleError extends Error {
  status: number;
  code?: string;
  issues: string[];

  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message);
    this.name = 'CategoryToggleError';
    this.status = status;
    this.code = code;
    this.issues = issues ?? [];
  }
}

const normalizeToggle = (raw: Record<string, unknown>): CategoryToggle => ({
  category: typeof raw.category === 'string' ? raw.category : '',
  subcategory: typeof raw.subcategory === 'string' ? raw.subcategory : null,
  enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
  updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
});

export const getAllToggles = async (): Promise<CategoryToggle[]> => {
  try {
    const response = await apiClient.get('/api/v1/admin/categories');
    const data = response.data;
    if (!Array.isArray(data)) {
      throw new CategoryToggleError('Unexpected response format', 500);
    }
    return data.map((item: Record<string, unknown>) => normalizeToggle(item));
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = (error.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to load category toggles';
      throw new CategoryToggleError(message, status, undefined, extractIssues(data));
    }
    throw error;
  }
};

export const updateToggle = async (request: UpdateToggleRequest): Promise<CategoryToggle> => {
  try {
    const response = await apiClient.put('/api/v1/admin/categories', request);
    return normalizeToggle(response.data as Record<string, unknown>);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = (error.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to update toggle';
      throw new CategoryToggleError(message, status, undefined, extractIssues(data));
    }
    throw error;
  }
};
