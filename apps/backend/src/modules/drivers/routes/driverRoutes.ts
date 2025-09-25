//apps/backend/src/modules/drivers/routes/driverRoutes.ts
import {
  InfractionController,
  infractionsParamsSchema,
} from '@/modules/infractions/controllers/infractionController.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DriverController, searchQuerySchema } from '../controllers/driverController.js';

export async function driverRoutes(fastify: FastifyInstance) {
  const driverController = new DriverController();
  const infractionController = new InfractionController();

  fastify.get(
    '/drivers',
    {
      // Protege a rota, exigindo que o usuário esteja logado
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
}
