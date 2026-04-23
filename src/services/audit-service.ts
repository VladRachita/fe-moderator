import axios from 'axios';
import apiClient from './api-client';

export interface EventTypeCount {
  eventType: string;
  count: number;
}

export interface UaClassCount {
  uaClass: string;
  count: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface AuditSummary {
  totalEvents: number;
  uniqueIpHashes: number;
  eventsByType: EventTypeCount[];
  eventsByUaClass: UaClassCount[];
  dailyCounts: DailyCount[];
}

export interface AuditEvent {
  id: string;
  userId: string | null;
  eventType: string;
  details: string | null;
  ipHash: string | null;
  uaClass: string | null;
  createdAt: string;
}

export interface AuditEventsPage {
  events: AuditEvent[];
  page: number;
  size: number;
  hasNext: boolean;
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

export class AuditServiceError extends Error {
  status: number;
  code?: string;
  issues: string[];

  constructor(message: string, status: number, code?: string, issues?: string[]) {
    super(message);
    this.name = 'AuditServiceError';
    this.status = status;
    this.code = code;
    this.issues = issues ?? [];
  }
}

const normalizeEventTypeCount = (raw: Record<string, unknown>): EventTypeCount => ({
  eventType: typeof raw.eventType === 'string' ? raw.eventType : '',
  count: typeof raw.count === 'number' ? raw.count : 0,
});

const normalizeUaClassCount = (raw: Record<string, unknown>): UaClassCount => ({
  uaClass: typeof raw.uaClass === 'string' ? raw.uaClass : '',
  count: typeof raw.count === 'number' ? raw.count : 0,
});

const normalizeDailyCount = (raw: Record<string, unknown>): DailyCount => ({
  date: typeof raw.date === 'string' ? raw.date : '',
  count: typeof raw.count === 'number' ? raw.count : 0,
});

const normalizeAuditEvent = (raw: Record<string, unknown>): AuditEvent => ({
  id: typeof raw.id === 'string' ? raw.id : '',
  userId: typeof raw.userId === 'string' ? raw.userId : null,
  eventType: typeof raw.eventType === 'string' ? raw.eventType : '',
  details: typeof raw.details === 'string' ? raw.details : null,
  ipHash: typeof raw.ipHash === 'string' ? raw.ipHash : null,
  uaClass: typeof raw.uaClass === 'string' ? raw.uaClass : null,
  createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
});

const normalizeSummary = (data: Record<string, unknown>): AuditSummary => ({
  totalEvents: typeof data.totalEvents === 'number' ? data.totalEvents : 0,
  uniqueIpHashes: typeof data.uniqueIpHashes === 'number' ? data.uniqueIpHashes : 0,
  eventsByType: Array.isArray(data.eventsByType)
    ? data.eventsByType.map((item: Record<string, unknown>) => normalizeEventTypeCount(item))
    : [],
  eventsByUaClass: Array.isArray(data.eventsByUaClass)
    ? data.eventsByUaClass.map((item: Record<string, unknown>) => normalizeUaClassCount(item))
    : [],
  dailyCounts: Array.isArray(data.dailyCounts)
    ? data.dailyCounts.map((item: Record<string, unknown>) => normalizeDailyCount(item))
    : [],
});

export const getAuditSummary = async (days?: number): Promise<AuditSummary> => {
  try {
    const params: Record<string, string> = {};
    if (days !== undefined) {
      params.days = String(days);
    }
    const response = await apiClient.get('/api/v1/admin/audit/summary', { params });
    return normalizeSummary(response.data as Record<string, unknown>);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = (error.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to load audit summary';
      throw new AuditServiceError(message, status, undefined, extractIssues(data));
    }
    throw error;
  }
};

export interface GetAuditEventsParams {
  eventType?: string;
  uaClass?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const getAuditEvents = async (params: GetAuditEventsParams): Promise<AuditEventsPage> => {
  try {
    const queryParams: Record<string, string> = {};
    if (params.eventType) queryParams.eventType = params.eventType;
    if (params.uaClass) queryParams.uaClass = params.uaClass;
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.size !== undefined) queryParams.size = String(params.size);

    const response = await apiClient.get('/api/v1/admin/audit/events', { params: queryParams });
    const data = response.data as Record<string, unknown>;

    return {
      events: Array.isArray(data.events)
        ? data.events.map((item: Record<string, unknown>) => normalizeAuditEvent(item))
        : [],
      page: typeof data.page === 'number' ? data.page : 0,
      size: typeof data.size === 'number' ? data.size : 20,
      hasNext: typeof data.hasNext === 'boolean' ? data.hasNext : false,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = (error.response?.data ?? {}) as Record<string, unknown>;
      const message =
        typeof data.message === 'string' ? data.message : 'Failed to load audit events';
      throw new AuditServiceError(message, status, undefined, extractIssues(data));
    }
    throw error;
  }
};

// ============================================================================
// Phase 2 audit dashboard: per-page summaries + event rows.
// ============================================================================

export interface CityCount {
  city: string;
  count: number;
}
export interface KeywordCount {
  keyword: string;
  count: number;
}
export interface TabCount {
  tab: string;
  count: number;
}
export interface SourceVideoCount {
  sourceVideoId: string;
  count: number;
}
export interface AgeBucketRow {
  bucket: string;
  count: number;
}
export interface DropOffRow {
  lastScreen: string;
  lastAction: string;
  count: number;
  avgSessionMs: number;
}
export interface LoggedVsAnonymous {
  loggedIn: number;
  anonymous: number;
}
export interface SwipesByRole {
  guest: number;
  customer: number;
  host: number;
}
export interface DropOffSummary {
  rows: DropOffRow[];
  avgSessionMs: number;
}

export interface FeedPageSummary {
  totalSwipes: number;
  swipesByRole: SwipesByRole;
  loggedVsAnonymous: LoggedVsAnonymous;
  topCities: CityCount[];
  dropOff: DropOffSummary;
  dailyCounts: DailyCount[];
}

export interface SearchPageSummary {
  totalSearches: number;
  topKeywords: KeywordCount[];
  topTabs: TabCount[];
  loggedVsAnonymous: LoggedVsAnonymous;
  topCities: CityCount[];
  dailyCounts: DailyCount[];
}

export interface VideoUploadPageSummary {
  totalUploads: number;
  uploadsByCity: CityCount[];
  dailyCounts: DailyCount[];
}

export interface RegistrationPageSummary {
  totalRegistrations: number;
  registrationsByCity: CityCount[];
  ageBuckets: AgeBucketRow[];
  dailyCounts: DailyCount[];
}

export interface ReservationsPageSummary {
  totalReservations: number;
  fromVideoCount: number;
  conversionRatePct: number;
  topSourceVideos: SourceVideoCount[];
  dailyCounts: DailyCount[];
}

// Per-page event row shapes (all user-identifying fields are hashed on the backend).

export interface FeedEvent {
  userIdHash: string | null;
  loggedIn: boolean | null;
  city: string | null;
  createdAt: string;
}
export interface SearchEvent {
  userIdHash: string | null;
  loggedIn: boolean | null;
  city: string | null;
  keyword: string | null;
  tab: string | null;
  createdAt: string;
}
export interface VideoUploadEvent {
  userIdHash: string | null;
  city: string | null;
  videoTitle: string | null;
  createdAt: string;
}
export interface RegistrationEvent {
  userIdHash: string | null;
  username: string | null;
  city: string | null;
  age: number | null;
  createdAt: string;
}
export interface ReservationsEvent {
  userIdHash: string | null;
  sourceVideoIdHash: string | null;
  hostIdHash: string | null;
  businessType: string | null;
  createdAt: string;
}

export interface AuditPageEventsResponse<T> {
  events: T[];
  page: number;
  size: number;
  hasNext: boolean;
}

// ----------------------------------------------------------------------------
// Normalisers
// ----------------------------------------------------------------------------

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const boolOrNull = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const normalizeCityCount = (raw: Record<string, unknown>): CityCount => ({
  city: str(raw.city),
  count: num(raw.count),
});
const normalizeKeywordCount = (raw: Record<string, unknown>): KeywordCount => ({
  keyword: str(raw.keyword),
  count: num(raw.count),
});
const normalizeTabCount = (raw: Record<string, unknown>): TabCount => ({
  tab: str(raw.tab),
  count: num(raw.count),
});
const normalizeSourceVideoCount = (raw: Record<string, unknown>): SourceVideoCount => ({
  sourceVideoId: str(raw.sourceVideoId),
  count: num(raw.count),
});
const normalizeAgeBucketRow = (raw: Record<string, unknown>): AgeBucketRow => ({
  bucket: str(raw.bucket),
  count: num(raw.count),
});
const normalizeDropOffRow = (raw: Record<string, unknown>): DropOffRow => ({
  lastScreen: str(raw.lastScreen),
  lastAction: str(raw.lastAction),
  count: num(raw.count),
  avgSessionMs: num(raw.avgSessionMs),
});
const normalizeLoggedVsAnon = (raw: Record<string, unknown>): LoggedVsAnonymous => ({
  loggedIn: num(raw.loggedIn),
  anonymous: num(raw.anonymous),
});
const normalizeSwipesByRole = (raw: Record<string, unknown>): SwipesByRole => ({
  guest: num(raw.guest),
  customer: num(raw.customer),
  host: num(raw.host),
});
const normalizeDropOffSummary = (raw: Record<string, unknown>): DropOffSummary => ({
  rows: Array.isArray(raw.rows)
    ? raw.rows.map((r) => normalizeDropOffRow(r as Record<string, unknown>))
    : [],
  avgSessionMs: num(raw.avgSessionMs),
});
const normalizeDailyCounts = (raw: unknown): DailyCount[] =>
  Array.isArray(raw) ? raw.map((r) => normalizeDailyCount(r as Record<string, unknown>)) : [];

const mapList = <T>(raw: unknown, fn: (r: Record<string, unknown>) => T): T[] =>
  Array.isArray(raw) ? raw.map((r) => fn(r as Record<string, unknown>)) : [];

const daysParam = (days?: number): Record<string, string> =>
  days !== undefined ? { days: String(days) } : {};

const eventsParams = (days?: number, page?: number, size?: number): Record<string, string> => {
  const p: Record<string, string> = {};
  if (days !== undefined) p.days = String(days);
  if (page !== undefined) p.page = String(page);
  if (size !== undefined) p.size = String(size);
  return p;
};

const handleError = (err: unknown, fallback: string): never => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 500;
    const data = (err.response?.data ?? {}) as Record<string, unknown>;
    const message = typeof data.message === 'string' ? data.message : fallback;
    throw new AuditServiceError(message, status, undefined, extractIssues(data));
  }
  throw err as Error;
};

// ----------------------------------------------------------------------------
// Summary getters (5)
// ----------------------------------------------------------------------------

export const getFeedSummary = async (days?: number): Promise<FeedPageSummary> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/feed/summary', {
      params: daysParam(days),
    });
    const data = response.data as Record<string, unknown>;
    return {
      totalSwipes: num(data.totalSwipes),
      swipesByRole: normalizeSwipesByRole((data.swipesByRole ?? {}) as Record<string, unknown>),
      loggedVsAnonymous: normalizeLoggedVsAnon(
        (data.loggedVsAnonymous ?? {}) as Record<string, unknown>,
      ),
      topCities: mapList(data.topCities, normalizeCityCount),
      dropOff: normalizeDropOffSummary((data.dropOff ?? {}) as Record<string, unknown>),
      dailyCounts: normalizeDailyCounts(data.dailyCounts),
    };
  } catch (err) {
    return handleError(err, 'Failed to load feed summary');
  }
};

export const getSearchSummary = async (days?: number): Promise<SearchPageSummary> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/search/summary', {
      params: daysParam(days),
    });
    const data = response.data as Record<string, unknown>;
    return {
      totalSearches: num(data.totalSearches),
      topKeywords: mapList(data.topKeywords, normalizeKeywordCount),
      topTabs: mapList(data.topTabs, normalizeTabCount),
      loggedVsAnonymous: normalizeLoggedVsAnon(
        (data.loggedVsAnonymous ?? {}) as Record<string, unknown>,
      ),
      topCities: mapList(data.topCities, normalizeCityCount),
      dailyCounts: normalizeDailyCounts(data.dailyCounts),
    };
  } catch (err) {
    return handleError(err, 'Failed to load search summary');
  }
};

export const getVideoUploadSummary = async (days?: number): Promise<VideoUploadPageSummary> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/video-upload/summary', {
      params: daysParam(days),
    });
    const data = response.data as Record<string, unknown>;
    return {
      totalUploads: num(data.totalUploads),
      uploadsByCity: mapList(data.uploadsByCity, normalizeCityCount),
      dailyCounts: normalizeDailyCounts(data.dailyCounts),
    };
  } catch (err) {
    return handleError(err, 'Failed to load video upload summary');
  }
};

export const getRegistrationSummary = async (days?: number): Promise<RegistrationPageSummary> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/registration/summary', {
      params: daysParam(days),
    });
    const data = response.data as Record<string, unknown>;
    return {
      totalRegistrations: num(data.totalRegistrations),
      registrationsByCity: mapList(data.registrationsByCity, normalizeCityCount),
      ageBuckets: mapList(data.ageBuckets, normalizeAgeBucketRow),
      dailyCounts: normalizeDailyCounts(data.dailyCounts),
    };
  } catch (err) {
    return handleError(err, 'Failed to load registration summary');
  }
};

export const getReservationsSummary = async (days?: number): Promise<ReservationsPageSummary> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/reservations/summary', {
      params: daysParam(days),
    });
    const data = response.data as Record<string, unknown>;
    return {
      totalReservations: num(data.totalReservations),
      fromVideoCount: num(data.fromVideoCount),
      conversionRatePct: num(data.conversionRatePct),
      topSourceVideos: mapList(data.topSourceVideos, normalizeSourceVideoCount),
      dailyCounts: normalizeDailyCounts(data.dailyCounts),
    };
  } catch (err) {
    return handleError(err, 'Failed to load reservations summary');
  }
};

// ----------------------------------------------------------------------------
// Event-row getters (5)
// ----------------------------------------------------------------------------

const wrapEvents = <T>(
  data: Record<string, unknown>,
  mapRow: (r: Record<string, unknown>) => T,
): AuditPageEventsResponse<T> => ({
  events: mapList(data.events, mapRow),
  page: num(data.page),
  size: typeof data.size === 'number' ? data.size : 20,
  hasNext: typeof data.hasNext === 'boolean' ? data.hasNext : false,
});

export const getFeedEvents = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<AuditPageEventsResponse<FeedEvent>> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/feed/events', {
      params: eventsParams(days, page, size),
    });
    return wrapEvents(response.data as Record<string, unknown>, (raw) => ({
      userIdHash: strOrNull(raw.userIdHash),
      loggedIn: boolOrNull(raw.loggedIn),
      city: strOrNull(raw.city),
      createdAt: str(raw.createdAt),
    }));
  } catch (err) {
    return handleError(err, 'Failed to load feed events');
  }
};

export const getSearchEvents = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<AuditPageEventsResponse<SearchEvent>> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/search/events', {
      params: eventsParams(days, page, size),
    });
    return wrapEvents(response.data as Record<string, unknown>, (raw) => ({
      userIdHash: strOrNull(raw.userIdHash),
      loggedIn: boolOrNull(raw.loggedIn),
      city: strOrNull(raw.city),
      keyword: strOrNull(raw.keyword),
      tab: strOrNull(raw.tab),
      createdAt: str(raw.createdAt),
    }));
  } catch (err) {
    return handleError(err, 'Failed to load search events');
  }
};

export const getVideoUploadEvents = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<AuditPageEventsResponse<VideoUploadEvent>> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/video-upload/events', {
      params: eventsParams(days, page, size),
    });
    return wrapEvents(response.data as Record<string, unknown>, (raw) => ({
      userIdHash: strOrNull(raw.userIdHash),
      city: strOrNull(raw.city),
      videoTitle: strOrNull(raw.videoTitle),
      createdAt: str(raw.createdAt),
    }));
  } catch (err) {
    return handleError(err, 'Failed to load video upload events');
  }
};

export const getRegistrationEvents = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<AuditPageEventsResponse<RegistrationEvent>> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/registration/events', {
      params: eventsParams(days, page, size),
    });
    return wrapEvents(response.data as Record<string, unknown>, (raw) => ({
      userIdHash: strOrNull(raw.userIdHash),
      username: strOrNull(raw.username),
      city: strOrNull(raw.city),
      age: numOrNull(raw.age),
      createdAt: str(raw.createdAt),
    }));
  } catch (err) {
    return handleError(err, 'Failed to load registration events');
  }
};

export const getReservationsEvents = async (
  days?: number,
  page?: number,
  size?: number,
): Promise<AuditPageEventsResponse<ReservationsEvent>> => {
  try {
    const response = await apiClient.get('/api/v1/admin/audit/pages/reservations/events', {
      params: eventsParams(days, page, size),
    });
    return wrapEvents(response.data as Record<string, unknown>, (raw) => ({
      userIdHash: strOrNull(raw.userIdHash),
      sourceVideoIdHash: strOrNull(raw.sourceVideoIdHash),
      hostIdHash: strOrNull(raw.hostIdHash),
      businessType: strOrNull(raw.businessType),
      createdAt: str(raw.createdAt),
    }));
  } catch (err) {
    return handleError(err, 'Failed to load reservations events');
  }
};
