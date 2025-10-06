// src/modules/infractions/controllers/infractionController.ts
import { logger } from '@/shared/utils/logger.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { InfractionService } from '../services/infractionService.js';

export const infractionsParamsSchema = z.object({
  driverId: z.coerce.number().int().positive(),
});

export class InfractionController {
  private infractionService: InfractionService;

  constructor() {
    this.infractionService = new InfractionService();
  }

  public async getForDriver(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { driverId } = request.params as z.infer<typeof infractionsParamsSchema>;
      const infractions = await this.infractionService.getInfractionsForDriver(driverId);

      logger.debug('Dados prontos para serem enviados na resposta:', infractions);

      return reply.send(infractions);
    } catch (error) {
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.status(404).send({ message: error.message });
      }
      throw error;
    }
  }
}
