import { z } from 'zod';
import { timeRangeEnum } from './metrics.schema.js';

// ============================================================================
// Query Schemas
// ============================================================================

export const userActivityRankingQuerySchema = z.object({
  timeRange: timeRangeEnum.default('last_7d'),
  role: z.string().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['lastLogin', 'totalLogins', 'totalPageViews', 'sessionTime', 'activeDays']).default('lastLogin'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userActivityDetailQuerySchema = z.object({
  timeRange: timeRangeEnum.default('last_30d'),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// Request Body Schemas
// ============================================================================

export const pageViewBodySchema = z.object({
  pagePath: z.string().min(1).max(500),
  pageTitle: z.string().max(255).optional().nullable(),
  sessionId: z.string().max(100).optional().nullable(),
  referrerPath: z.string().max(500).optional().nullable(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const userActivityRankingResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    users: z.array(z.object({
      userId: z.string(),
      username: z.string(),
      fullName: z.string(),
      role: z.string(),
      lastLoginAt: z.string().nullable(),
      lastActivityAt: z.string().nullable(),
      totalLogins: z.number(),
      uniquePagesVisited: z.number(),
      totalPageViews: z.number(),
      totalSessionTimeMinutes: z.number(),
      activeDays: z.number(),
      avgSessionMinutes: z.number(),
    })),
    totalUsers: z.number(),
    activeUsersCount: z.number(),
    inactiveUsersCount: z.number(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  }),
});

export const userActivityDetailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      fullName: z.string(),
      email: z.string(),
      role: z.string(),
      status: z.string(),
      createdAt: z.string(),
    }),
    activity: z.object({
      lastLoginAt: z.string().nullable(),
      lastLoginIp: z.string().nullable(),
      lastActivityAt: z.string().nullable(),
      totalLogins: z.number(),
      uniquePagesVisited: z.number(),
      totalPageViews: z.number(),
      totalSessionTimeMinutes: z.number(),
      activeDays: z.number(),
      avgSessionMinutes: z.number(),
    }),
    topPages: z.array(z.object({
      pagePath: z.string(),
      pageTitle: z.string().nullable(),
      viewCount: z.number(),
      totalTimeMinutes: z.number(),
      lastVisited: z.string(),
    })),
    recentLogins: z.array(z.object({
      loginAt: z.string(),
      logoutAt: z.string().nullable(),
      sessionDurationMinutes: z.number().nullable(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
    })),
    activityOverTime: z.array(z.object({
      date: z.string(),
      logins: z.number(),
      pageViews: z.number(),
      sessionMinutes: z.number(),
    })),
  }),
});

export const pageViewResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UserActivityRankingQueryInput = z.infer<typeof userActivityRankingQuerySchema>;
export type UserActivityDetailQueryInput = z.infer<typeof userActivityDetailQuerySchema>;
export type PageViewBodyInput = z.infer<typeof pageViewBodySchema>;
