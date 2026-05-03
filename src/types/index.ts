
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

export type UserType = 'PLATFORM' | 'HOST';

export interface IUserSession {
  authenticated: boolean;
  subject?: string;
  name?: string;
  email?: string;
  userId?: string;
  clientId?: string;
  role?: string;
  userType?: UserType;
  identityKey?: string;
  error?: string;
  scopes: string[];
  roles: string[];
  needsPasswordChange?: boolean;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
    canManageBusinesses: boolean;
  };
}

export interface IUserIdentity {
  authenticated: boolean;
  userId?: string;
  clientId?: string;
  role?: string;
  roles?: string[];
  userType?: UserType;
  identityKey?: string;
  needsPasswordChange?: boolean;
  loginCodeRequired?: boolean;
  permissions: {
    canModerate: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
    canManageBusinesses: boolean;
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

// ==================== HOST SELF-SERVICE RESERVATION TYPES (V2) ====================

/**
 * Restaurant-specific reservation details (party size, seating, dietary).
 * Backend: ReservationRestaurantDetailsDto on RESTAURANT-typed reservations.
 */
export interface IHostRestaurantReservationDetails {
  partySize: number | null;
  seatingPreference: string | null;
  dietaryRestrictions: string | null;
  occasion: string | null;
  childrenCount: number | null;
}

/**
 * Single reservation as exposed via `GET /api/v1/business/reservations` /
 * `/{id}` / `?updatedSince=` to the HOST's own dashboard.
 *
 * Mirrors backend `ReservationResponseDto`. Customer PII (`contactName`,
 * `contactPhone`, `contactEmail`) is intentional — the host has a legitimate
 * business need to contact their customer.
 */
export interface IHostReservation {
  id: string;
  customerId: string;
  hostId: string;
  businessId: string | null;
  businessName: string;
  businessType: BusinessCategory;
  status: ReservationStatus;
  reservationDate: string;          // ISO LocalDate (YYYY-MM-DD)
  reservationTime: string;          // ISO LocalTime (HH:mm:ss)
  estimatedDurationMinutes: number | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  specialRequests: string | null;
  restaurantDetails: IHostRestaurantReservationDetails | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  couponId: string | null;
  couponTitle: string | null;
  createdAt: string;
  updatedAt: string | null;         // null on freshly-created rows; backend uses COALESCE for polling
  isEdited: boolean;
  editedAt: string | null;
  maxCapacity: number | null;
}

export interface IHostReservationStats {
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  todayCount: number;
}

/**
 * Response from `GET /api/v1/business/reservations` (with or without
 * `?updatedSince=`). When `updatedSince` is set, `totalElements = result.size`
 * and `totalPages = 1` (V1.5 follow-up #4 documented hasNext semantics).
 *
 * §V2 — `serverTime` is captured at request entry; web polling clients
 * compute the next `updatedSince` as `serverTime - 5000ms` (C3 safety
 * margin, matching `HostReservationsDeltaPageDto.pollSafetyMarginMs`).
 */
export interface IHostReservationsPage {
  reservations: IHostReservation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  stats: IHostReservationStats;
  serverTime: string;               // ISO Instant
}

/**
 * §V2 — single audit-trail entry from `GET /api/v1/business/reservations/{id}/history`.
 *
 * `changedByRole` is computed server-side by comparing the actor's UUID to
 * the reservation's hostId / customerId — the raw UUID is intentionally
 * NOT exposed to the client (GDPR posture, see backend DTO KDoc).
 */
export type ChangedByRole = 'HOST' | 'CUSTOMER' | 'SYSTEM';

export interface IReservationHistoryEntry {
  id: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  changedByRole: ChangedByRole;
  changedAt: string;                // ISO Instant
  reason: string | null;
}

export interface IReservationHistoryResponse {
  reservationId: string;
  entries: IReservationHistoryEntry[];
}

/**
 * §V2 review (approve/reject) request body.
 */
export type ReservationDecision = 'APPROVE' | 'REJECT';

export interface IReviewReservationRequest {
  decision: ReservationDecision;
  reviewNotes?: string;
}

export interface ICancelReservationRequest {
  reason: string;
}
