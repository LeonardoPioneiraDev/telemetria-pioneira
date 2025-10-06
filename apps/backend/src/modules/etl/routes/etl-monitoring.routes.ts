//apps/backend/src/modules/etl/routes/etl-monitoring.routes.ts
import { authMiddleware } from '@/modules/auth/middleware/authMiddleware.js';
import { FastifyInstance } from 'fastify';
import { EtlMonitoringController } from '../controllers/etl-monitoring.controller.js';
import { historyQuerySchema, metricsQuerySchema } from '../schemas/etl-monitoring.schema.js';

export async function etlMonitoringRoutes(fastify: FastifyInstance) {
  const controller = new EtlMonitoringController();

  fastify.get(
    '/etl/status',
    {
      preHandler: [authMiddleware.authenticate()], // ✅ Mudança
      schema: {
        description: 'Obtém o status geral do ETL de eventos',
        tags: ['ETL', 'Monitoramento'],
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getStatus.bind(controller)
  );

  fastify.get(
    '/etl/metrics',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Obtém métricas detalhadas do ETL (eventos por hora, dia, tops)',
        tags: ['ETL', 'Monitoramento'],
        querystring: metricsQuerySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getMetrics.bind(controller)
  );

  fastify.get(
    '/etl/history',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Obtém histórico de execuções do ETL (últimos N jobs)',
        tags: ['ETL', 'Monitoramento'],
        querystring: historyQuerySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getHistory.bind(controller)
  );

  fastify.get(
    '/etl/health',
    {
      schema: {
        description: 'Health check rápido do ETL (para monitoramento externo)',
        tags: ['ETL', 'Sistema'],
      },
    },
    controller.getHealth.bind(controller)
  );
}
