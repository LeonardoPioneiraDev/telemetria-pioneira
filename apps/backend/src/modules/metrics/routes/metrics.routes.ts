import { authMiddleware } from '@/modules/auth/middleware/authMiddleware.js';
import { USER_PERMISSIONS } from '@/shared/constants/index.js';
import { FastifyInstance } from 'fastify';
import { metricsController } from '../controllers/metrics.controller.js';
import { dashboardResponseSchema, metricsQuerySchema } from '../schemas/metrics.schema.js';

export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  const adminPreHandler = [
    authMiddleware.authenticate(),
    authMiddleware.requirePermission(USER_PERMISSIONS.SYSTEM_METRICS),
  ];

  fastify.get(
    '/admin/metrics/dashboard',
    {
      preHandler: adminPreHandler,
      schema: {
        description: 'Get complete dashboard metrics for the admin panel',
        tags: ['Admin', 'Metrics'],
        querystring: metricsQuerySchema,
        response: {
          200: dashboardResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    metricsController.getDashboardMetrics.bind(metricsController)
  );
}
