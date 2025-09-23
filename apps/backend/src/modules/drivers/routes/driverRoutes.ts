import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DriverController, searchQuerySchema } from '../controllers/driverController.js';

export async function driverRoutes(fastify: FastifyInstance) {
  const driverController = new DriverController();

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
}
