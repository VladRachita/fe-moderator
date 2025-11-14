
export interface IComment {
  id: string;
  text: string;
  author: string;
}

export interface IVideo {
  id: string;
  title: string;
  ownerId?: string;
  ownerDisplayName?: string;
  ownerEmail?: string;
  videoType?: VideoVisibility;
  submittedAt?: string;
  comments?: IComment[];
}

export interface IPendingVideo extends IVideo {
  presignedUrl: string;
}

export interface IModeratedVideo extends IVideo {
  status: VideoStatus;
  moderatedAt?: string;
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

export type VideoVisibility = 'PUBLIC' | 'PRIVATE' | (string & {});

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

export interface IStaffUserSummary {
  userId: string;
  username: string;
  email?: string;
  role: PlatformRole;
  mustRotatePassword: boolean;
  lastPasswordRotation?: string;
  createdAt: string;
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
  roles?: string[];
  identityKey?: string;
  needsPasswordChange?: boolean;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  };
}

export type BusinessCategory = 'RESTAURANT' | 'HOTEL';
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IBusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface IHostApplication {
  applicationId: string;
  userId: string;
  username: string;
  email: string;
  status: ApplicationStatus;
  businessName: string;
  category: BusinessCategory;
  businessAddress: string;
  phoneNumber: string;
  priceRange: PriceRange;
  businessHours: IBusinessHours;
  servicesOffered: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface IApplicationReviewRequest {
  status: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

export interface IApplicationsPage {
  applications: IHostApplication[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
