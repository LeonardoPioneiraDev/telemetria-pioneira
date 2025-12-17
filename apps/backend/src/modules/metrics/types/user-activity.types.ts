import type { TimeRange } from './metrics.types.js';

// ============================================================================
// Page View Types
// ============================================================================

export interface PageViewData {
  userId: string;
  pagePath: string;
  pageTitle?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrerPath?: string | null;
}

// ============================================================================
// Ranking Filters
// ============================================================================

export type SortByField = 'lastLogin' | 'totalLogins' | 'totalPageViews' | 'sessionTime' | 'activeDays';
export type SortOrder = 'asc' | 'desc';

export interface UserActivityRankingFilters {
  timeRange: TimeRange;
  role?: string;
  search?: string;
  sortBy: SortByField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

// ============================================================================
// Ranking Response
// ============================================================================

export interface UserActivityRankingItem {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  totalLogins: number;
  uniquePagesVisited: number;
  totalPageViews: number;
  totalSessionTimeMinutes: number;
  activeDays: number;
  avgSessionMinutes: number;
}

export interface UserActivityRankingResponse {
  users: UserActivityRankingItem[];
  totalUsers: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// User Detail Types
// ============================================================================

export interface UserDetailInfo {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface UserDetailActivity {
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastActivityAt: string | null;
  totalLogins: number;
  uniquePagesVisited: number;
  totalPageViews: number;
  totalSessionTimeMinutes: number;
  activeDays: number;
  avgSessionMinutes: number;
}

export interface UserTopPage {
  pagePath: string;
  pageTitle: string | null;
  viewCount: number;
  totalTimeMinutes: number;
  lastVisited: string;
}

export interface UserLoginHistory {
  loginAt: string;
  logoutAt: string | null;
  sessionDurationMinutes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface UserActivityOverTime {
  date: string;
  logins: number;
  pageViews: number;
  sessionMinutes: number;
}

export interface UserActivityDetailResponse {
  user: UserDetailInfo;
  activity: UserDetailActivity;
  topPages: UserTopPage[];
  recentLogins: UserLoginHistory[];
  activityOverTime: UserActivityOverTime[];
}
