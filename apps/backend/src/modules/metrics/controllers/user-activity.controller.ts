import { logger } from '@/shared/utils/logger.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  pageViewBodySchema,
  userActivityDetailQuerySchema,
  userActivityRankingQuerySchema,
  userIdParamSchema,
} from '../schemas/user-activity.schema.js';
import { userActivityMetricsService } from '../services/user-activity-metrics.service.js';
import type { TimeRange } from '../types/metrics.types.js';
import type { UserActivityRankingFilters } from '../types/user-activity.types.js';

interface AuthenticatedUser {
  id?: string;
  role?: string;
}

export class UserActivityController {
  private static instance: UserActivityController;

  private constructor() {}

  public static getInstance(): UserActivityController {
    if (!UserActivityController.instance) {
      UserActivityController.instance = new UserActivityController();
    }
    return UserActivityController.instance;
  }

  /**
   * Extrai o IP real do cliente considerando proxies/load balancers
   */
  private getClientIp(request: FastifyRequest): string | null {
    // 1. Cloudflare
    const cfConnectingIp = request.headers['cf-connecting-ip'];
    if (cfConnectingIp && typeof cfConnectingIp === 'string') {
      return cfConnectingIp.trim();
    }

    // 2. X-Real-IP (Nginx)
    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string') {
      return xRealIp.trim();
    }

    // 3. X-Forwarded-For (standard)
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const forwardedFor: string | undefined = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;
      if (forwardedFor) {
        const clientIp = forwardedFor.split(',')[0]?.trim();
        if (clientIp) {
          return clientIp;
        }
      }
    }

    // 4. Fallback: Fastify's IP detection
    return request.ip || null;
  }

  /**
   * GET /api/admin/metrics/users
   * Retorna ranking de atividade de usuários
   */
  public async getUserActivityRanking(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const parsed = userActivityRankingQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid query parameters',
          errors: parsed.error.issues,
        });
      }

      const filters: UserActivityRankingFilters = {
        timeRange: parsed.data.timeRange as TimeRange,
        ...(parsed.data.role && { role: parsed.data.role }),
        ...(parsed.data.search && { search: parsed.data.search }),
        sortBy: parsed.data.sortBy,
        sortOrder: parsed.data.sortOrder,
        page: parsed.data.page,
        limit: parsed.data.limit,
      };

      logger.info('Fetching user activity ranking', {
        userId: (request.user as AuthenticatedUser | undefined)?.id,
        filters,
      });

      const result = await userActivityMetricsService.getUserActivityRanking(filters);

      return reply.send({
        success: true,
        message: 'User activity ranking retrieved successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Error fetching user activity ranking:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve user activity ranking',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/admin/metrics/users/:id
   * Retorna detalhes de atividade de um usuário específico
   */
  public async getUserActivityDetail(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const paramsParsed = userIdParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid user ID',
          errors: paramsParsed.error.issues,
        });
      }

      const queryParsed = userActivityDetailQuerySchema.safeParse(request.query);
      const timeRange: TimeRange = queryParsed.success ? queryParsed.data.timeRange : 'last_30d';

      const userId = paramsParsed.data.id;

      logger.info('Fetching user activity detail', {
        requesterId: (request.user as AuthenticatedUser | undefined)?.id,
        targetUserId: userId,
        timeRange,
      });

      const result = await userActivityMetricsService.getUserActivityDetail(userId, timeRange);

      if (!result) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
        });
      }

      return reply.send({
        success: true,
        message: 'User activity detail retrieved successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Error fetching user activity detail:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve user activity detail',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/metrics/page-view
   * Registra uma visualização de página (disponível para todos os usuários autenticados)
   */
  public async logPageView(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user?.id) {
        return reply.status(401).send({
          success: false,
          message: 'User not authenticated',
        });
      }

      const parsed = pageViewBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid request body',
          errors: parsed.error.issues,
        });
      }

      const { pagePath, pageTitle, sessionId, referrerPath } = parsed.data;

      // Log async (não bloqueia resposta)
      userActivityMetricsService.logPageViewAsync({
        userId: user.id,
        pagePath,
        pageTitle: pageTitle || null,
        sessionId: sessionId || null,
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'] || null,
        referrerPath: referrerPath || null,
      });

      return reply.send({
        success: true,
        message: 'Page view logged',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Mesmo com erro, não bloqueia a navegação do usuário
      logger.error('Error logging page view:', error);
      return reply.send({
        success: true,
        message: 'Page view acknowledged',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const userActivityController = UserActivityController.getInstance();
