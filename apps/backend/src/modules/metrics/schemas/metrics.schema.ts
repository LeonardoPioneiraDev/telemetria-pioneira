import { z } from 'zod';

export const timeRangeEnum = z.enum(['last_hour', 'last_3h', 'last_6h', 'last_24h', 'last_7d', 'last_30d']);

export const metricsQuerySchema = z.object({
  timeRange: timeRangeEnum.default('last_24h'),
});

export const requestsOverTimeQuerySchema = z.object({
  timeRange: timeRangeEnum.default('last_24h'),
  granularity: z.enum(['hour', 'day']).optional().default('hour'),
});

export const dashboardResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    summary: z.object({
      totalRequests: z.number(),
      avgLatencyMs: z.number(),
      p95LatencyMs: z.number(),
      errorRate: z.number(),
      uniqueUsers: z.number(),
      uniqueLoggedInUsers: z.number(),
      timeRange: timeRangeEnum,
    }),
    charts: z.object({
      requestsOverTime: z.array(
        z.object({
          timestamp: z.string(),
          requestCount: z.number(),
          avgLatencyMs: z.number(),
          p95LatencyMs: z.number(),
        })
      ),
      statusDistribution: z.array(
        z.object({
          statusGroup: z.string(),
          count: z.number(),
        })
      ),
      dailyPeaks: z.array(
        z.object({
          date: z.string(),
          totalRequests: z.number(),
          peakHour: z.number(),
          peakHourRequests: z.number(),
        })
      ),
    }),
    rankings: z.object({
      topUsers: z.array(
        z.object({
          userId: z.string(),
          username: z.string(),
          fullName: z.string(),
          role: z.string(),
          requestCount: z.number(),
          activeDays: z.number(),
        })
      ),
      slowestEndpoints: z.array(
        z.object({
          endpoint: z.string(),
          method: z.string(),
          requestCount: z.number(),
          avgLatencyMs: z.number(),
          p95LatencyMs: z.number(),
          maxLatencyMs: z.number(),
        })
      ),
    }),
  }),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;
export type RequestsOverTimeQueryInput = z.infer<typeof requestsOverTimeQuerySchema>;
