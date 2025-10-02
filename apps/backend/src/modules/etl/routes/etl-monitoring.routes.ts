import { FastifyInstance } from 'fastify';
import { EtlMonitoringController } from '../controllers/etl-monitoring.controller.js';
import { historyQuerySchema, metricsQuerySchema } from '../schemas/etl-monitoring.schema.js';

export async function etlMonitoringRoutes(fastify: FastifyInstance) {
  const controller = new EtlMonitoringController();

  // ========== GET /api/etl/status ==========
  fastify.get(
    '/etl/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Obtém o status geral do ETL de eventos',
        tags: ['ETL', 'Monitoramento'],

        security: [{ bearerAuth: [] }],
      },
    },
    controller.getStatus.bind(controller)
  );

  // ========== GET /api/etl/metrics ==========
  fastify.get(
    '/etl/metrics',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Obtém métricas detalhadas do ETL (eventos por hora, dia, tops)',
        tags: ['ETL', 'Monitoramento'],
        querystring: metricsQuerySchema,

        security: [{ bearerAuth: [] }],
      },
    },
    controller.getMetrics.bind(controller)
  );

  // ========== GET /api/etl/history ==========
  fastify.get(
    '/etl/history',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Obtém histórico de execuções do ETL (últimos N jobs)',
        tags: ['ETL', 'Monitoramento'],
        querystring: historyQuerySchema,

        security: [{ bearerAuth: [] }],
      },
    },
    controller.getHistory.bind(controller)
  );

  // ========== GET /api/etl/health ==========
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
