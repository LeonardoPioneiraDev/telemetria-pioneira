// apps/backend/src/modules/drivers/routes/driverRoutes.ts
import {
  InfractionController,
  infractionsParamsSchema,
} from '@/modules/infractions/controllers/infractionController.js';
import {
  dateRangeQuerySchema,
  PerformanceReportController,
  performanceReportParamsSchema,
  performanceReportQuerySchema,
} from '@/modules/performance/controllers/performanceReportController.js';
import { performanceReportResponseSchema } from '@/modules/performance/schemas/performanceReport.schema.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DriverController, searchQuerySchema } from '../controllers/driverController.js';

export async function driverRoutes(fastify: FastifyInstance) {
  const driverController = new DriverController();
  const infractionController = new InfractionController();
  const performanceReportController = new PerformanceReportController();

  fastify.get(
    '/drivers',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Busca motoristas por nome.',
        tags: ['Drivers'],
        querystring: searchQuerySchema,
        response: {
          200: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              employee_number: z.string().nullable(),
            })
          ),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    driverController.search.bind(driverController)
  );

  fastify.get(
    '/drivers/:driverId/infractions',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Busca as infrações de um motorista específico.',
        tags: ['Drivers', 'Infractions'],
        params: infractionsParamsSchema,

        response: {
          200: z.array(
            z.object({
              id: z.number(),
              occurredAt: z.string(),
              description: z.string(),
              speed: z.number().nullable(),
              speedLimit: z.number().nullable(),
              location: z.string(),
              value: z.number().nullable(),
            })
          ),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    infractionController.getForDriver.bind(infractionController)
  );

  fastify.get(
    '/drivers/:driverId/performance-report',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description:
          'Gera relatório de performance de um motorista para geração de formulário, baseado em uma data de referência e janela de dias (pra trás).',
        tags: ['Drivers', 'Performance'],
        params: performanceReportParamsSchema,
        querystring: performanceReportQuerySchema,
        response: {
          200: performanceReportResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    performanceReportController.getPerformanceReport.bind(performanceReportController)
  );

  // ✅ NOVA ROTA: Endpoint para buscar relatório por intervalo de datas
  fastify.get(
    '/drivers/:driverId/performance-report/range',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description:
          'Gera relatório de performance de um motorista para geração de formulário, pesquisando entre uma data inicial e final.',
        tags: ['Drivers', 'Performance'],
        params: performanceReportParamsSchema, // driverId
        querystring: dateRangeQuerySchema, // startDate, endDate
        response: {
          200: performanceReportResponseSchema, // O mesmo schema de resposta do relatório existente
        },
        security: [{ bearerAuth: [] }],
      },
    },
    performanceReportController.getPerformanceReportByDateRange.bind(performanceReportController)
  );
}
