
export interface IComment {
  id: string;
  text: string;
  author: string;
}

export interface IVideo {
  id: string;
  title: string;
  comments?: IComment[];
}

export interface IPendingVideo extends IVideo {
  presignedUrl: string;
}

export interface IModeratedVideo extends IVideo {
  status: VideoStatus;
  moderatedAt: string;
  moderator?: string;
}

export enum VideoStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IAnalyticsSummary {
  approvedCount: number;
  rejectedCount: number;
  pendingLast24hCount: number;
}

export type PlatformRole = 'MODERATOR' | 'ANALYST';

export interface IAdminUserRequest {
  username: string;
  email: string;
  role: PlatformRole;
  temporaryPassword?: string;
}

export interface IAdminUserProvisionResult {
  userId?: string;
  username: string;
  email: string;
  role: PlatformRole;
  temporaryPassword?: string;
  requiresPasswordChange: boolean;
}

export interface IPasswordRotationPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface IPasswordRotationResult {
  rotatedAt: string;
}

export interface IUserSession {
  authenticated: boolean;
  subject?: string;
  name?: string;
  email?: string;
  userId?: string;
  clientId?: string;
  role?: string;
  identityKey?: string;
  error?: string;
  scopes: string[];
  roles: string[];
  needsPasswordChange?: boolean;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  };
}

export interface IUserIdentity {
  authenticated: boolean;
  userId?: string;
  clientId?: string;
  role?: string;
  identityKey?: string;
  needsPasswordChange?: boolean;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  };
}
