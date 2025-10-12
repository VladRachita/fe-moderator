import axios from 'axios';
import apiClient from './api-client';
import { IAdminUserProvisionResult, IAdminUserRequest } from '@/types';

export class AdminUserProvisionError extends Error {
  status: number;
  code?: string;
  issues: string[];

  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message);
    this.name = 'AdminUserProvisionError';
    this.status = status;
    this.code = code;
    this.issues = issues ?? [];
  }
}

const normalizeProvisionResponse = (
  payload: IAdminUserRequest,
  response: Record<string, unknown>,
): IAdminUserProvisionResult => {
  const role = typeof response.role === 'string' ? response.role : payload.role;
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
      const issues: string[] = [];

      const errorMessage =
        typeof responseData.message === 'string' ? responseData.message : 'Failed to create user';

      if (Array.isArray(responseData.errors)) {
        responseData.errors
          .filter((item): item is string => typeof item === 'string')
          .forEach((item) => issues.push(item));
      }

      if (Array.isArray(responseData.details)) {
        responseData.details
          .filter((item): item is string => typeof item === 'string')
          .forEach((item) => issues.push(item));
      }

      throw new AdminUserProvisionError(errorMessage, status, code, issues);
    }

    throw new AdminUserProvisionError('Failed to create user', 500);
  }
};
