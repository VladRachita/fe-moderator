
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
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
  };
}

export interface IUserIdentity {
  authenticated: boolean;
  userId?: string;
  clientId?: string;
  role?: string;
  identityKey?: string;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
  };
}
