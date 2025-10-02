import { FastifyInstance } from 'fastify';
import {
  HistoricalLoadController,
  jobIdParamSchema,
  listLoadsQuerySchema,
  startHistoricalLoadSchema,
} from '../controllers/historical-load.controller.js';

export async function historicalLoadRoutes(fastify: FastifyInstance) {
  const controller = new HistoricalLoadController();

  // Iniciar carga histórica
  fastify.post(
    '/etl/historical/start',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Inicia uma carga histórica de eventos',
        tags: ['ETL', 'Historical'],
        body: startHistoricalLoadSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.startLoad.bind(controller)
  );

  // Obter status de uma carga
  fastify.get(
    '/etl/historical/:jobId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Obtém o status de uma carga histórica',
        tags: ['ETL', 'Historical'],
        params: jobIdParamSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getLoadStatus.bind(controller)
  );

  // Listar cargas recentes
  fastify.get(
    '/etl/historical',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Lista as cargas históricas recentes',
        tags: ['ETL', 'Historical'],
        querystring: listLoadsQuerySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    controller.listRecentLoads.bind(controller)
  );

  // Cancelar carga
  fastify.delete(
    '/etl/historical/:jobId',
    {
      preHandler: [fastify.authenticate],
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
