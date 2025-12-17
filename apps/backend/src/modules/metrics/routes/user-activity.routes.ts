import { authMiddleware } from '@/modules/auth/middleware/authMiddleware.js';
import { USER_PERMISSIONS } from '@/shared/constants/index.js';
import { FastifyInstance } from 'fastify';
import { userActivityController } from '../controllers/user-activity.controller.js';
import {
  pageViewBodySchema,
  pageViewResponseSchema,
  userActivityDetailQuerySchema,
  userActivityDetailResponseSchema,
  userActivityRankingQuerySchema,
  userActivityRankingResponseSchema,
  userIdParamSchema,
} from '../schemas/user-activity.schema.js';

export async function userActivityRoutes(fastify: FastifyInstance): Promise<void> {
  // Admin handlers - require SYSTEM_METRICS permission
  const adminPreHandler = [
    authMiddleware.authenticate(),
    authMiddleware.requirePermission(USER_PERMISSIONS.SYSTEM_METRICS),
  ];

  // Authenticated user handler - only requires authentication
  const authPreHandler = [
    authMiddleware.authenticate(),
  ];

  /**
   * GET /api/admin/metrics/users
   * Lista ranking de atividade de usuários
   */
  fastify.get(
    '/admin/metrics/users',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get user activity ranking with filters and pagination',
        tags: ['Admin', 'Metrics', 'User Activity'],
        querystring: userActivityRankingQuerySchema,
        response: {
          200: userActivityRankingResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userActivityController.getUserActivityRanking.bind(userActivityController)
  );

  /**
   * GET /api/admin/metrics/users/:id
   * Detalhes de atividade de um usuário específico
   */
  fastify.get(
    '/admin/metrics/users/:id',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get detailed activity information for a specific user',
        tags: ['Admin', 'Metrics', 'User Activity'],
        params: userIdParamSchema,
        querystring: userActivityDetailQuerySchema,
        response: {
          200: userActivityDetailResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userActivityController.getUserActivityDetail.bind(userActivityController)
  );

  /**
   * POST /api/metrics/page-view
   * Registra visualização de página (disponível para todos os usuários autenticados)
   */
  fastify.post(
    '/metrics/page-view',
    {
      preHandler: authPreHandler,
      schema: {
        description: 'Log a page view event for the authenticated user',
        tags: ['Metrics', 'User Activity'],
        body: pageViewBodySchema,
        response: {
          200: pageViewResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userActivityController.logPageView.bind(userActivityController)
  );
}
