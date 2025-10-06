//apps/backend/src/modules/etl/routes/historical-load.routes.ts
import { authMiddleware } from '@/modules/auth/middleware/authMiddleware.js';
import { FastifyInstance } from 'fastify';
import {
  HistoricalLoadController,
  jobIdParamSchema,
  listLoadsQuerySchema,
  startHistoricalLoadSchema,
} from '../controllers/historical-load.controller.js';

export async function historicalLoadRoutes(fastify: FastifyInstance) {
  const controller = new HistoricalLoadController();

  fastify.post(
    '/etl/historical/start',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Inicia uma carga histórica de eventos',
        tags: ['ETL', 'Historical'],
        body: startHistoricalLoadSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.startLoad.bind(controller)
  );

  fastify.get(
    '/etl/historical/:jobId',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Obtém o status de uma carga histórica',
        tags: ['ETL', 'Historical'],
        params: jobIdParamSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getLoadStatus.bind(controller)
  );

  fastify.get(
    '/etl/historical',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Lista as cargas históricas recentes',
        tags: ['ETL', 'Historical'],
        querystring: listLoadsQuerySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.listRecentLoads.bind(controller)
  );

  fastify.delete(
    '/etl/historical/:jobId',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Cancela uma carga histórica em andamento',
        tags: ['ETL', 'Historical'],
        params: jobIdParamSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.cancelLoad.bind(controller)
  );
}
