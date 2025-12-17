import { AppDataSource } from '@/data-source.js';
import { UserPageView } from '@/entities/user-page-view.entity.js';
import { UserEntity } from '@/entities/user.entity.js';
import { logger } from '@/shared/utils/logger.js';
import type { TimeRange } from '../types/metrics.types.js';
import type {
  PageViewData,
  UserActivityDetailResponse,
  UserActivityOverTime,
  UserActivityRankingFilters,
  UserActivityRankingItem,
  UserActivityRankingResponse,
  UserLoginHistory,
  UserTopPage,
} from '../types/user-activity.types.js';

// ============================================================================
// User Agent Parsing Helpers
// ============================================================================

function parseDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'Desconhecido';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') && !ua.includes('ipad') && !ua.includes('tablet')) return 'Mobile';
  if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobile'))) return 'Tablet';
  return 'Desktop';
}

function parseOS(userAgent: string | null): string {
  if (!userAgent) return 'Desconhecido';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Linux') && !userAgent.includes('Android')) return 'Linux';
  if (userAgent.includes('CrOS')) return 'Chrome OS';
  return 'Outro';
}

function parseBrowser(userAgent: string | null): string {
  if (!userAgent) return 'Desconhecido';
  if (userAgent.includes('Edg/') || userAgent.includes('Edge/')) return 'Edge';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/') && !userAgent.includes('OPR/')) return 'Chrome';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
  return 'Outro';
}

export class UserActivityMetricsService {
  private static instance: UserActivityMetricsService;

  private constructor() {}

  public static getInstance(): UserActivityMetricsService {
    if (!UserActivityMetricsService.instance) {
      UserActivityMetricsService.instance = new UserActivityMetricsService();
    }
    return UserActivityMetricsService.instance;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (timeRange) {
      case 'last_hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'last_3h':
        startDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        break;
      case 'last_6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case 'last_24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private getSortColumn(sortBy: string): string {
    const sortMap: Record<string, string> = {
      lastLogin: 'ul.last_login_at',
      totalLogins: 'total_logins',
      totalPageViews: 'unique_pages_visited',
      sessionTime: 'total_session_minutes',
      activeDays: 'active_days',
    };
    return sortMap[sortBy] || 'ul.last_login_at';
  }

  // ============================================================================
  // Page View Logging
  // ============================================================================

  public async logPageView(data: PageViewData): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(UserPageView);

      const pageView = repository.create({
        userId: data.userId,
        pagePath: data.pagePath,
        pageTitle: data.pageTitle || null,
        sessionId: data.sessionId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        referrerPath: data.referrerPath || null,
        viewedAt: new Date(),
      });

      await repository.save(pageView);

      // Update user's last_activity_at
      await AppDataSource.getRepository(UserEntity).update(
        { id: data.userId },
        { lastActivityAt: new Date() }
      );
    } catch (error) {
      logger.error('Error logging page view:', error);
      throw error;
    }
  }

  public logPageViewAsync(data: PageViewData): void {
    setImmediate(() => {
      this.logPageView(data).catch(error => {
        logger.error('Error in async page view logging:', error);
      });
    });
  }

  // ============================================================================
  // User Activity Ranking
  // ============================================================================

  public async getUserActivityRanking(
    filters: UserActivityRankingFilters
  ): Promise<UserActivityRankingResponse> {
    const { startDate, endDate } = this.calculateDateRange(filters.timeRange);
    const offset = (filters.page - 1) * filters.limit;
    const sortColumn = this.getSortColumn(filters.sortBy);
    const sortDirection = filters.sortOrder.toUpperCase();

    try {
      // Build WHERE conditions for users (for main query, starts at $3)
      const whereConditions: string[] = ["u.status = 'active'"];
      const params: (string | Date | number)[] = [startDate, endDate];
      let paramIndex = 3;

      // Build WHERE conditions for count query (starts at $1)
      const countWhereConditions: string[] = ["u.status = 'active'"];
      const countParams: (string | Date | number)[] = [];
      let countParamIndex = 1;

      if (filters.role) {
        whereConditions.push(`u.role = $${paramIndex}`);
        params.push(filters.role);
        paramIndex++;

        countWhereConditions.push(`u.role = $${countParamIndex}`);
        countParams.push(filters.role);
        countParamIndex++;
      }

      if (filters.search) {
        whereConditions.push(`(
          u.username ILIKE $${paramIndex} OR
          u.full_name ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;

        countWhereConditions.push(`(
          u.username ILIKE $${countParamIndex} OR
          u.full_name ILIKE $${countParamIndex} OR
          u.email ILIKE $${countParamIndex}
        )`);
        countParams.push(`%${filters.search}%`);
        countParamIndex++;
      }

      const whereClause = whereConditions.join(' AND ');
      const countWhereClause = countWhereConditions.join(' AND ');

      // Main query for ranking
      const query = `
        WITH user_logins AS (
          SELECT
            user_id,
            COUNT(*)::integer as total_logins,
            MAX(timestamp) as last_login_at,
            MAX(ip_address::text) as last_login_ip
          FROM user_activity_logs
          WHERE activity_type = 'login'
            AND timestamp >= $1 AND timestamp <= $2
          GROUP BY user_id
        ),
        user_pages AS (
          SELECT
            user_id,
            COUNT(DISTINCT page_path)::integer as unique_pages_visited,
            COUNT(*)::integer as total_page_views,
            COUNT(DISTINCT DATE_TRUNC('day', viewed_at AT TIME ZONE 'America/Sao_Paulo'))::integer as active_days,
            COALESCE(SUM(time_on_page_ms) / 60000.0, 0)::numeric(10,2) as total_session_minutes
          FROM user_page_views
          WHERE viewed_at >= $1 AND viewed_at <= $2
          GROUP BY user_id
        )
        SELECT
          u.id as user_id,
          u.username,
          u.full_name,
          u.role,
          ul.last_login_at,
          u.last_activity_at,
          COALESCE(ul.total_logins, 0)::integer as total_logins,
          COALESCE(up.unique_pages_visited, 0)::integer as unique_pages_visited,
          COALESCE(up.total_page_views, 0)::integer as total_page_views,
          COALESCE(up.total_session_minutes, 0)::numeric(10,2) as total_session_minutes,
          COALESCE(up.active_days, 0)::integer as active_days
        FROM users u
        LEFT JOIN user_logins ul ON u.id = ul.user_id
        LEFT JOIN user_pages up ON u.id = up.user_id
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection} NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(filters.limit, offset);

      const results = await AppDataSource.query(query, params);

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*)::integer as total
        FROM users u
        WHERE ${countWhereClause}
      `;

      const countResult = await AppDataSource.query(countQuery, countParams);
      const totalUsers = parseInt(countResult[0]?.total || '0', 10);

      // Count active vs inactive users in period
      const activityCountQuery = `
        WITH user_activity AS (
          SELECT DISTINCT user_id FROM user_page_views
          WHERE viewed_at >= $1 AND viewed_at <= $2
          UNION
          SELECT DISTINCT user_id FROM user_activity_logs
          WHERE activity_type = 'login' AND timestamp >= $1 AND timestamp <= $2
        )
        SELECT COUNT(*)::integer as active_count
        FROM users u
        WHERE u.status = 'active' AND u.id IN (SELECT user_id FROM user_activity)
      `;

      const activityResult = await AppDataSource.query(activityCountQuery, [startDate, endDate]);
      const activeUsersCount = parseInt(activityResult[0]?.active_count || '0', 10);

      // Map results
      const users: UserActivityRankingItem[] = results.map((row: Record<string, unknown>) => {
        const totalLogins = parseInt(String(row['total_logins']), 10) || 0;
        const totalSessionMinutes = parseFloat(String(row['total_session_minutes'])) || 0;

        return {
          userId: row['user_id'] as string,
          username: row['username'] as string,
          fullName: row['full_name'] as string,
          role: row['role'] as string,
          lastLoginAt: row['last_login_at'] ? (row['last_login_at'] as Date).toISOString() : null,
          lastActivityAt: row['last_activity_at'] ? (row['last_activity_at'] as Date).toISOString() : null,
          totalLogins,
          uniquePagesVisited: parseInt(String(row['unique_pages_visited']), 10) || 0,
          totalPageViews: parseInt(String(row['total_page_views']), 10) || 0,
          totalSessionTimeMinutes: totalSessionMinutes,
          activeDays: parseInt(String(row['active_days']), 10) || 0,
          avgSessionMinutes: totalLogins > 0 ? parseFloat((totalSessionMinutes / totalLogins).toFixed(2)) : 0,
        };
      });

      return {
        users,
        totalUsers,
        activeUsersCount,
        inactiveUsersCount: totalUsers - activeUsersCount,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(totalUsers / filters.limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user activity ranking:', error);
      throw error;
    }
  }

  // ============================================================================
  // User Activity Detail
  // ============================================================================

  public async getUserActivityDetail(
    userId: string,
    timeRange: TimeRange
  ): Promise<UserActivityDetailResponse | null> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      // Get user info
      const userResult = await AppDataSource.query(`
        SELECT
          id, username, full_name, email, role, status, created_at
        FROM users
        WHERE id = $1
      `, [userId]);

      if (!userResult || userResult.length === 0) {
        return null;
      }

      const userRow = userResult[0];

      // Get activity summary
      const activityQuery = `
        WITH user_logins AS (
          SELECT
            COUNT(*)::integer as total_logins,
            MAX(timestamp) as last_login_at,
            MAX(ip_address::text) FILTER (WHERE timestamp = (SELECT MAX(timestamp) FROM user_activity_logs WHERE user_id = $1 AND activity_type = 'login')) as last_login_ip
          FROM user_activity_logs
          WHERE user_id = $1 AND activity_type = 'login'
            AND timestamp >= $2 AND timestamp <= $3
        ),
        user_pages AS (
          SELECT
            COUNT(DISTINCT page_path)::integer as unique_pages_visited,
            COUNT(*)::integer as total_page_views,
            COUNT(DISTINCT DATE_TRUNC('day', viewed_at AT TIME ZONE 'America/Sao_Paulo'))::integer as active_days,
            COALESCE(SUM(time_on_page_ms) / 60000.0, 0)::numeric(10,2) as total_session_minutes
          FROM user_page_views
          WHERE user_id = $1
            AND viewed_at >= $2 AND viewed_at <= $3
        )
        SELECT
          ul.total_logins,
          ul.last_login_at,
          ul.last_login_ip,
          up.unique_pages_visited,
          up.total_page_views,
          up.total_session_minutes,
          up.active_days,
          (SELECT last_activity_at FROM users WHERE id = $1) as last_activity_at
        FROM user_logins ul, user_pages up
      `;

      const activityResult = await AppDataSource.query(activityQuery, [userId, startDate, endDate]);
      const activityRow = activityResult[0] || {};

      const totalLogins = parseInt(activityRow['total_logins'] || '0', 10);
      const totalSessionMinutes = parseFloat(activityRow['total_session_minutes'] || '0');

      // Get top pages
      const topPagesQuery = `
        SELECT
          page_path,
          page_title,
          COUNT(*)::integer as view_count,
          COALESCE(SUM(time_on_page_ms) / 60000.0, 0)::numeric(10,2) as total_time_minutes,
          MAX(viewed_at) as last_visited
        FROM user_page_views
        WHERE user_id = $1
          AND viewed_at >= $2 AND viewed_at <= $3
        GROUP BY page_path, page_title
        ORDER BY view_count DESC
        LIMIT 10
      `;

      const topPagesResult = await AppDataSource.query(topPagesQuery, [userId, startDate, endDate]);

      const topPages: UserTopPage[] = topPagesResult.map((row: Record<string, unknown>) => ({
        pagePath: row['page_path'] as string,
        pageTitle: row['page_title'] as string | null,
        viewCount: parseInt(String(row['view_count']), 10),
        totalTimeMinutes: parseFloat(String(row['total_time_minutes'])) || 0,
        lastVisited: (row['last_visited'] as Date).toISOString(),
      }));

      // Get recent logins with logout times
      const loginsQuery = `
        WITH login_events AS (
          SELECT
            id,
            timestamp as login_at,
            ip_address::text as ip_address,
            user_agent,
            LEAD(timestamp) OVER (ORDER BY timestamp) as next_event_time,
            LEAD(activity_type) OVER (ORDER BY timestamp) as next_event_type
          FROM user_activity_logs
          WHERE user_id = $1 AND activity_type IN ('login', 'logout')
          ORDER BY timestamp DESC
        )
        SELECT
          login_at,
          CASE WHEN next_event_type = 'logout' THEN next_event_time ELSE NULL END as logout_at,
          CASE
            WHEN next_event_type = 'logout'
            THEN EXTRACT(EPOCH FROM (next_event_time - login_at)) / 60
            ELSE NULL
          END as session_duration_minutes,
          ip_address,
          user_agent
        FROM login_events
        WHERE login_at >= $2 AND login_at <= $3
        ORDER BY login_at DESC
        LIMIT 10
      `;

      const loginsResult = await AppDataSource.query(loginsQuery, [userId, startDate, endDate]);

      const recentLogins: UserLoginHistory[] = loginsResult.map((row: Record<string, unknown>) => {
        const userAgent = row['user_agent'] as string | null;
        return {
          loginAt: (row['login_at'] as Date).toISOString(),
          logoutAt: row['logout_at'] ? (row['logout_at'] as Date).toISOString() : null,
          sessionDurationMinutes: row['session_duration_minutes'] ? parseFloat(String(row['session_duration_minutes'])) : null,
          ipAddress: row['ip_address'] as string | null,
          userAgent,
          deviceType: parseDeviceType(userAgent),
          os: parseOS(userAgent),
          browser: parseBrowser(userAgent),
        };
      });

      // Get activity over time
      const activityOverTimeQuery = `
        WITH dates AS (
          SELECT generate_series(
            DATE_TRUNC('day', $2::timestamptz AT TIME ZONE 'America/Sao_Paulo'),
            DATE_TRUNC('day', $3::timestamptz AT TIME ZONE 'America/Sao_Paulo'),
            '1 day'::interval
          )::date as date
        ),
        daily_logins AS (
          SELECT
            DATE_TRUNC('day', timestamp AT TIME ZONE 'America/Sao_Paulo')::date as date,
            COUNT(*)::integer as logins
          FROM user_activity_logs
          WHERE user_id = $1 AND activity_type = 'login'
            AND timestamp >= $2 AND timestamp <= $3
          GROUP BY 1
        ),
        daily_pages AS (
          SELECT
            DATE_TRUNC('day', viewed_at AT TIME ZONE 'America/Sao_Paulo')::date as date,
            COUNT(*)::integer as page_views,
            COALESCE(SUM(time_on_page_ms) / 60000.0, 0)::numeric(10,2) as session_minutes
          FROM user_page_views
          WHERE user_id = $1
            AND viewed_at >= $2 AND viewed_at <= $3
          GROUP BY 1
        )
        SELECT
          d.date::text,
          COALESCE(dl.logins, 0)::integer as logins,
          COALESCE(dp.page_views, 0)::integer as page_views,
          COALESCE(dp.session_minutes, 0)::numeric(10,2) as session_minutes
        FROM dates d
        LEFT JOIN daily_logins dl ON d.date = dl.date
        LEFT JOIN daily_pages dp ON d.date = dp.date
        ORDER BY d.date ASC
      `;

      const activityOverTimeResult = await AppDataSource.query(activityOverTimeQuery, [userId, startDate, endDate]);

      const activityOverTime: UserActivityOverTime[] = activityOverTimeResult.map((row: Record<string, unknown>) => ({
        date: row['date'] as string,
        logins: parseInt(String(row['logins']), 10),
        pageViews: parseInt(String(row['page_views']), 10),
        sessionMinutes: parseFloat(String(row['session_minutes'])) || 0,
      }));

      return {
        user: {
          id: userRow['id'] as string,
          username: userRow['username'] as string,
          fullName: userRow['full_name'] as string,
          email: userRow['email'] as string,
          role: userRow['role'] as string,
          status: userRow['status'] as string,
          createdAt: (userRow['created_at'] as Date).toISOString(),
        },
        activity: {
          lastLoginAt: activityRow['last_login_at'] ? (activityRow['last_login_at'] as Date).toISOString() : null,
          lastLoginIp: activityRow['last_login_ip'] as string | null,
          lastActivityAt: activityRow['last_activity_at'] ? (activityRow['last_activity_at'] as Date).toISOString() : null,
          totalLogins,
          uniquePagesVisited: parseInt(activityRow['unique_pages_visited'] || '0', 10),
          totalPageViews: parseInt(activityRow['total_page_views'] || '0', 10),
          totalSessionTimeMinutes: totalSessionMinutes,
          activeDays: parseInt(activityRow['active_days'] || '0', 10),
          avgSessionMinutes: totalLogins > 0 ? parseFloat((totalSessionMinutes / totalLogins).toFixed(2)) : 0,
        },
        topPages,
        recentLogins,
        activityOverTime,
      };
    } catch (error) {
      logger.error('Error fetching user activity detail:', error);
      throw error;
    }
  }
}

export const userActivityMetricsService = UserActivityMetricsService.getInstance();
