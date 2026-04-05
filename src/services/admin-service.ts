import axios from 'axios';
import apiClient from './api-client';
import {
  IAdminUserProvisionResult,
  IAdminUserRequest,
  IStaffUserSummary,
  PlatformRole,
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

class AdminServiceError extends Error {
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

export class AdminUserProvisionError extends AdminServiceError {
  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message, status, code, issues);
    this.name = 'AdminUserProvisionError';
  }
}

export class AdminUserRoleUpdateError extends AdminServiceError {
  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message, status, code, issues);
    this.name = 'AdminUserRoleUpdateError';
  }
}

export class AdminUserListError extends AdminServiceError {
  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message, status, code, issues);
    this.name = 'AdminUserListError';
  }
}

const resolvePlatformRole = (value: unknown): PlatformRole | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MODERATOR' || normalized === 'ROLE_MODERATOR') {
    return 'MODERATOR';
  }
  if (normalized === 'ANALYST' || normalized === 'ROLE_ANALYST') {
    return 'ANALYST';
  }
  return null;
};

const normalizeProvisionResponse = (
  payload: IAdminUserRequest,
  response: Record<string, unknown>,
): IAdminUserProvisionResult => {
  const role = resolvePlatformRole(response.role) ?? payload.role;
  const temporaryPassword =
    typeof response.temporaryPassword === 'string' ? response.temporaryPassword : undefined;
  const requiresPasswordChange =
    typeof response.requiresPasswordChange === 'boolean'
      ? response.requiresPasswordChange
      : Boolean(temporaryPassword);

  return {
    userId: typeof response.userId === 'string' ? response.userId : undefined,
    username: typeof response.username === 'string' ? response.username : payload.username,
    email: typeof response.email === 'string' ? response.email : payload.email,
    role,
    temporaryPassword,
    requiresPasswordChange,
    hasLoginCode: Boolean(response.hasLoginCode),
  };
};

export const createAdminUser = async (
  payload: IAdminUserRequest,
): Promise<IAdminUserProvisionResult> => {
  try {
    const response = await apiClient.post('/api/v1/admin/users', payload);
    return normalizeProvisionResponse(payload, response.data ?? {});
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const issues = extractIssues(responseData);
      const errorMessage =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to create user';

      throw new AdminUserProvisionError(errorMessage, status, code, issues);
    }

    throw new AdminUserProvisionError('Failed to create user', 500);
  }
};

const normalizeStaffList = (payload: unknown): IStaffUserSummary[] => {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((item): IStaffUserSummary | null => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      const entry = item as Record<string, unknown>;
      const userId = typeof entry.userId === 'string' ? entry.userId : undefined;
      const username = typeof entry.username === 'string' ? entry.username : undefined;
      const role = resolvePlatformRole(entry.role);
      if (!userId || !username || !role) {
        return null;
      }
      return {
        userId,
        username,
        email: typeof entry.email === 'string' ? entry.email : undefined,
        role: role as PlatformRole,
        mustRotatePassword: Boolean(entry.mustRotatePassword),
        lastPasswordRotation:
          typeof entry.lastPasswordRotation === 'string' ? entry.lastPasswordRotation : undefined,
        createdAt:
          typeof entry.createdAt === 'string' ? entry.createdAt : new Date(0).toISOString(),
        hasLoginCode: Boolean(entry.hasLoginCode),
      };
    })
    .filter((value): value is IStaffUserSummary => Boolean(value));
};

export const listAdminUsers = async (): Promise<IStaffUserSummary[]> => {
  try {
    const response = await apiClient.get('/api/v1/admin/users/');
    return normalizeStaffList(response.data ?? []);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const issues = extractIssues(responseData);
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to load staff';
      throw new AdminUserListError(message, status, code, issues);
    }
    throw new AdminUserListError('Failed to load staff', 500);
  }
};

export const setLoginCode = async (userId: string, loginCode: string): Promise<void> => {
  try {
    await apiClient.put(`/api/v1/admin/users/${userId}/login-code`, { loginCode });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to set login code';
      throw new AdminUserProvisionError(message, error.response.status);
    }
    throw new AdminUserProvisionError('Failed to set login code', 500);
  }
};

export const removeLoginCode = async (userId: string): Promise<void> => {
  try {
    await apiClient.delete(`/api/v1/admin/users/${userId}/login-code`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to remove login code';
      throw new AdminUserProvisionError(message, error.response.status);
    }
    throw new AdminUserProvisionError('Failed to remove login code', 500);
  }
};

export const updateAdminUserRole = async (
  userId: string,
  role: PlatformRole,
): Promise<IStaffUserSummary> => {
  try {
    const response = await apiClient.patch(`/api/v1/admin/users/${userId}/role`, { role });
    const [updated] = normalizeStaffList([response.data ?? {}]);
    if (!updated) {
      throw new AdminUserRoleUpdateError('Received malformed response from server', 500);
    }
    return updated;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const message =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to update role';
      const issues = extractIssues(responseData);
      throw new AdminUserRoleUpdateError(message, status, code, issues);
    }
    throw new AdminUserRoleUpdateError('Failed to update role', 500);
  }
};
