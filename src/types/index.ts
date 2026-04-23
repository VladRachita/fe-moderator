
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
  loginCode?: string;
}

export interface IAdminUserProvisionResult {
  userId?: string;
  username: string;
  email: string;
  role: PlatformRole;
  temporaryPassword?: string;
  requiresPasswordChange: boolean;
  hasLoginCode: boolean;
}

export interface IStaffUserSummary {
  userId: string;
  username: string;
  email?: string;
  role: PlatformRole;
  mustRotatePassword: boolean;
  lastPasswordRotation?: string;
  createdAt: string;
  hasLoginCode: boolean;
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
  loginCodeRequired?: boolean;
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

export type ReportType = 'VIDEO' | 'USER';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED';

export interface IReport {
  id: string;
  reportType: ReportType;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reporterUsername: string;
  reporterId: string;
  targetVideoId: string | null;
  targetVideoTitle: string | null;
  targetUserId: string | null;
  targetUsername: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface IReportsPage {
  items: IReport[];
  page: number;
  size: number;
  hasNext: boolean;
}

// ==================== ADMIN RESERVATION MONITORING ====================

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type NotificationDeliveryStatus = 'READ' | 'ACKNOWLEDGED' | 'DELIVERED' | 'PENDING' | 'FAILED';
export type NotificationType =
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_REJECTED'
  | 'RESERVATION_CANCELLED_BY_CUSTOMER'
  | 'RESERVATION_CANCELLED_BY_HOST'
  | 'RESERVATION_REMINDER'
  | 'RESERVATION_EDITED'
  | 'RESERVATION_COMPLETED'
  | 'RESERVATION_NO_SHOW';

export interface IAdminReservationNotification {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  createdAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  readAt: string | null;
  retryCount: number;
  lastRetryAt: string | null;
  deliveryStatus: NotificationDeliveryStatus;
  recipientRole: 'HOST' | 'CUSTOMER' | 'UNKNOWN';
}

export interface IAdminReservation {
  id: string;
  customerId: string;
  hostId: string;
  businessName: string;
  businessType: BusinessCategory;
  status: ReservationStatus;
  reservationDate: string;
  reservationTime: string;
  contactName: string;
  contactEmail: string;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  notifications: IAdminReservationNotification[];
}

export interface IAdminReservationStats {
  pendingCount: number;
  confirmedCount: number;
  editedCount: number;
  completedCount: number;
  noShowCount: number;
  totalCount: number;
}

export interface IAdminReservationsPage {
  reservations: IAdminReservation[];
  page: number;
  size: number;
  hasNext: boolean;
  stats: IAdminReservationStats;
}
