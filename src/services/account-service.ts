import axios from 'axios';
import apiClient from './api-client';
import { IPasswordRotationPayload, IPasswordRotationResult } from '@/types';

export class PasswordRotationError extends Error {
  status: number;
  code?: string;
  issues: string[];

  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message);
    this.name = 'PasswordRotationError';
    this.status = status;
    this.code = code;
    this.issues = issues ?? [];
  }
}

export const rotatePassword = async (
  payload: IPasswordRotationPayload,
): Promise<IPasswordRotationResult> => {
  try {
    const response = await apiClient.patch('/api/v1/account/password', payload);
    return {
      rotatedAt:
        typeof response.data?.rotatedAt === 'string'
          ? response.data.rotatedAt
          : new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = (error.response.data ?? {}) as Record<string, unknown>;
      const status = error.response.status;
      const code = typeof responseData.code === 'string' ? responseData.code : undefined;
      const issues: string[] = [];

      const message =
        typeof responseData.message === 'string'
          ? responseData.message
          : 'Failed to rotate password';

      const details = responseData.errors ?? responseData.details;
      if (Array.isArray(details)) {
        details
          .filter((entry): entry is string => typeof entry === 'string')
          .forEach((entry) => issues.push(entry));
      }

      throw new PasswordRotationError(message, status, code, issues);
    }

    throw new PasswordRotationError('Failed to rotate password', 500);
  }
};
