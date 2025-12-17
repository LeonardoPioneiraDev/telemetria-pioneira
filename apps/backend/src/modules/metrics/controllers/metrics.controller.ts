import { logger } from '@/shared/utils/logger.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { metricsQuerySchema } from '../schemas/metrics.schema.js';
import { metricsService } from '../services/metrics.service.js';
import { DashboardResponse, TimeRange } from '../types/metrics.types.js';

interface AuthenticatedUser {
  id?: string;
}

export class MetricsController {
  private static instance: MetricsController;

  private constructor() {}

  public static getInstance(): MetricsController {
    if (!MetricsController.instance) {
      MetricsController.instance = new MetricsController();
    }
    return MetricsController.instance;
  }

  public async getDashboardMetrics(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const parsed = metricsQuerySchema.safeParse(request.query);
      const timeRange: TimeRange = parsed.success ? parsed.data.timeRange : 'last_24h';

      logger.info('Fetching dashboard metrics', {
        userId: (request.user as AuthenticatedUser | undefined)?.id,
        timeRange,
      });

      const [
        summary,
        requestsOverTime,
        statusDistribution,
        statusCodeDetails,
        topUsers,
        slowestEndpoints,
        dailyPeaks,
        uniqueLogins,
        deviceDistribution,
        osDistribution,
        browserDistribution,
      ] = await Promise.all([
        metricsService.getDashboardSummary(timeRange),
        metricsService.getRequestsOverTime(
          timeRange,
          ['last_hour', 'last_3h', 'last_6h', 'last_24h'].includes(timeRange) ? 'hour' : 'day'
        ),
        metricsService.getStatusCodeDistribution(timeRange),
        metricsService.getStatusCodeDetails(timeRange),
        metricsService.getTopUsersByActivity(timeRange, 10),
        metricsService.getEndpointsRankedByLatency(timeRange, 10),
        metricsService.getDailyRequestPeaks(timeRange),
        metricsService.getUniqueLoggedInUsers(timeRange),
        metricsService.getDeviceDistribution(timeRange),
        metricsService.getOperatingSystemDistribution(timeRange),
        metricsService.getBrowserDistribution(timeRange),
      ]);

      logger.info('Platform distribution data fetched', {
        deviceDistribution,
        osDistribution,
        browserDistribution,
      });

      const responseData: DashboardResponse = {
        summary: {
          ...summary,
          uniqueLoggedInUsers: uniqueLogins,
        },
        charts: {
          requestsOverTime,
          statusDistribution,
          statusCodeDetails,
          dailyPeaks,
        },
        rankings: {
          topUsers,
          slowestEndpoints,
        },
        platform: {
          devices: deviceDistribution,
          operatingSystems: osDistribution,
          browsers: browserDistribution,
        },
      };

      logger.info('Sending dashboard response with platform data', {
        hasDevices: responseData.platform.devices.length,
        hasOS: responseData.platform.operatingSystems.length,
        hasBrowsers: responseData.platform.browsers.length,
      });

      return reply.send({
        success: true,
        message: 'Dashboard metrics retrieved successfully',
        data: responseData,
      });
    } catch (error) {
      logger.error('Error fetching dashboard metrics:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve dashboard metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const metricsController = MetricsController.getInstance();
