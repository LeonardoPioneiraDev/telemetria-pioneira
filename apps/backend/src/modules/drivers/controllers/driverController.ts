import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { DriverService } from '../services/driverService.js';

export const searchQuerySchema = z.object({
  search: z.string().min(3, { message: 'O termo de busca deve ter no mínimo 3 caracteres.' }),
});

export class DriverController {
  private driverService: DriverService;

  constructor() {
    this.driverService = new DriverService();
  }

  /**
   * Handler para a busca de motoristas.
   */
  public async search(
    request: FastifyRequest, // ✅ Remover tipo genérico
    reply: FastifyReply
  ) {
    const { search } = request.query as z.infer<typeof searchQuerySchema>; // ✅ Type assertion
    const drivers = await this.driverService.searchByName(search);
    return reply.send(drivers);
  }
}
