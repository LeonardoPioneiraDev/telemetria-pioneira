import { AppDataSource } from '@/data-source.js';
import { logger } from '@/shared/utils/logger.js';
import {
  DailyPeak,
  DashboardMetrics,
  EndpointLatencyRanking,
  RequestsOverTimeData,
  StatusCodeDistribution,
  TimeRange,
  TopUserByActivity,
} from '../types/metrics.types.js';

export class MetricsService {
  private static instance: MetricsService;

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

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
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  public async getDashboardSummary(timeRange: TimeRange): Promise<DashboardMetrics> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      const summaryQuery = `
        SELECT
          COUNT(*)::integer as total_requests,
          COALESCE(AVG(latency_ms), 0)::numeric(10,2) as avg_latency,
          COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::integer as p95_latency,
          COUNT(*) FILTER (WHERE status_code >= 400)::integer as error_count,
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::integer as unique_users
        FROM request_logs
        WHERE timestamp >= $1 AND timestamp <= $2
      `;

      const result = await AppDataSource.query(summaryQuery, [startDate, endDate]);
      const row = result[0];

      const totalRequests = parseInt(row.total_requests, 10) || 0;
      const errorCount = parseInt(row.error_count, 10) || 0;
      const errorRate = totalRequests > 0
        ? parseFloat(((errorCount / totalRequests) * 100).toFixed(2))
        : 0;

      return {
        totalRequests,
        avgLatencyMs: parseFloat(row.avg_latency) || 0,
        p95LatencyMs: parseInt(row.p95_latency, 10) || 0,
        errorRate,
        uniqueUsers: parseInt(row.unique_users, 10) || 0,
        uniqueLoggedInUsers: 0,
        timeRange,
      };
    } catch (error) {
      logger.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }

  public async getUniqueLoggedInUsers(timeRange: TimeRange): Promise<number> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      const query = `
        SELECT COUNT(DISTINCT user_id)::integer as unique_users
        FROM user_activity_logs
        WHERE activity_type = 'login'
          AND timestamp >= $1
          AND timestamp <= $2
      `;

      const result = await AppDataSource.query(query, [startDate, endDate]);
      return parseInt(result[0]?.unique_users || '0', 10);
    } catch (error) {
      logger.error('Error fetching unique logged in users:', error);
      return 0;
    }
  }

  public async getRequestsOverTime(
    timeRange: TimeRange,
    granularity: 'hour' | 'day' = 'hour'
  ): Promise<RequestsOverTimeData[]> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);
    const truncateUnit = granularity === 'hour' ? 'hour' : 'day';

    try {
      const query = `
        SELECT
          DATE_TRUNC('${truncateUnit}', timestamp AT TIME ZONE 'America/Sao_Paulo') as time_bucket,
          COUNT(*)::integer as request_count,
          COALESCE(AVG(latency_ms), 0)::numeric(10,2) as avg_latency,
          COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::integer as p95_latency
        FROM request_logs
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `;

      const results = await AppDataSource.query(query, [startDate, endDate]);

      return results.map((row: Record<string, unknown>) => ({
        timestamp: (row.time_bucket as Date).toISOString(),
        requestCount: parseInt(row.request_count as string, 10),
        avgLatencyMs: parseFloat(row.avg_latency as string) || 0,
        p95LatencyMs: parseInt(row.p95_latency as string, 10) || 0,
      }));
    } catch (error) {
      logger.error('Error fetching requests over time:', error);
      throw error;
    }
  }

  public async getStatusCodeDistribution(timeRange: TimeRange): Promise<StatusCodeDistribution[]> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      const query = `
        SELECT
          CASE
            WHEN status_code >= 200 AND status_code < 300 THEN '2xx Success'
            WHEN status_code >= 300 AND status_code < 400 THEN '3xx Redirect'
            WHEN status_code >= 400 AND status_code < 500 THEN '4xx Client Error'
            WHEN status_code >= 500 THEN '5xx Server Error'
            ELSE 'Other'
          END as status_group,
          COUNT(*)::integer as count
        FROM request_logs
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY status_group
        ORDER BY count DESC
      `;

      const results = await AppDataSource.query(query, [startDate, endDate]);

      return results.map((row: Record<string, unknown>) => ({
        statusGroup: row.status_group as string,
        count: parseInt(row.count as string, 10),
      }));
    } catch (error) {
      logger.error('Error fetching status code distribution:', error);
      throw error;
    }
  }

  public async getTopUsersByActivity(
    timeRange: TimeRange,
    limit: number = 10
  ): Promise<TopUserByActivity[]> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      const query = `
        SELECT
          rl.user_id,
          COALESCE(u.username, 'unknown') as username,
          COALESCE(u.full_name, 'Unknown User') as full_name,
          COALESCE(u.role::text, 'unknown') as role,
          COUNT(*)::integer as request_count,
          COUNT(DISTINCT DATE_TRUNC('day', rl.timestamp))::integer as active_days
        FROM request_logs rl
        LEFT JOIN users u ON rl.user_id = u.id
        WHERE rl.timestamp >= $1
          AND rl.timestamp <= $2
          AND rl.user_id IS NOT NULL
        GROUP BY rl.user_id, u.username, u.full_name, u.role
        ORDER BY request_count DESC
        LIMIT $3
      `;

      const results = await AppDataSource.query(query, [startDate, endDate, limit]);

      return results.map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        username: row.username as string,
        fullName: row.full_name as string,
        role: row.role as string,
        requestCount: parseInt(row.request_count as string, 10),
        activeDays: parseInt(row.active_days as string, 10),
      }));
    } catch (error) {
      logger.error('Error fetching top users by activity:', error);
      throw error;
    }
  }

  public async getEndpointsRankedByLatency(
    timeRange: TimeRange,
    limit: number = 10
  ): Promise<EndpointLatencyRanking[]> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      const query = `
        SELECT
          COALESCE(route_pattern, endpoint) as endpoint,
          method,
          COUNT(*)::integer as request_count,
          COALESCE(AVG(latency_ms), 0)::numeric(10,2) as avg_latency,
          COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::integer as p95_latency,
          COALESCE(MAX(latency_ms), 0)::integer as max_latency
        FROM request_logs
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY COALESCE(route_pattern, endpoint), method
        HAVING COUNT(*) >= 5
        ORDER BY avg_latency DESC
        LIMIT $3
      `;

      const results = await AppDataSource.query(query, [startDate, endDate, limit]);

      return results.map((row: Record<string, unknown>) => ({
        endpoint: row.endpoint as string,
        method: row.method as string,
        requestCount: parseInt(row.request_count as string, 10),
        avgLatencyMs: parseFloat(row.avg_latency as string) || 0,
        p95LatencyMs: parseInt(row.p95_latency as string, 10) || 0,
        maxLatencyMs: parseInt(row.max_latency as string, 10) || 0,
      }));
    } catch (error) {
      logger.error('Error fetching endpoints ranked by latency:', error);
      throw error;
    }
  }

  public async getDailyRequestPeaks(timeRange: TimeRange): Promise<DailyPeak[]> {
    const { startDate, endDate } = this.calculateDateRange(timeRange);

    try {
      const query = `
        WITH daily_hourly AS (
          SELECT
            DATE_TRUNC('day', timestamp AT TIME ZONE 'America/Sao_Paulo')::date as day,
            EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Sao_Paulo')::integer as hour,
            COUNT(*)::integer as requests
          FROM request_logs
          WHERE timestamp >= $1 AND timestamp <= $2
          GROUP BY day, hour
        ),
        daily_peaks AS (
          SELECT
            day,
            hour as peak_hour,
            requests as peak_requests,
            ROW_NUMBER() OVER (PARTITION BY day ORDER BY requests DESC) as rn
          FROM daily_hourly
        )
        SELECT
          dh.day::text as date,
          SUM(dh.requests)::integer as total_requests,
          dp.peak_hour::integer,
          dp.peak_requests::integer
        FROM daily_hourly dh
        JOIN daily_peaks dp ON dh.day = dp.day AND dp.rn = 1
        GROUP BY dh.day, dp.peak_hour, dp.peak_requests
        ORDER BY dh.day ASC
      `;

      const results = await AppDataSource.query(query, [startDate, endDate]);

      return results.map((row: Record<string, unknown>) => ({
        date: row.date as string,
        totalRequests: parseInt(row.total_requests as string, 10),
        peakHour: parseInt(row.peak_hour as string, 10),
        peakHourRequests: parseInt(row.peak_requests as string, 10),
      }));
    } catch (error) {
      logger.error('Error fetching daily request peaks:', error);
      throw error;
    }
  }
}

export const metricsService = MetricsService.getInstance();
