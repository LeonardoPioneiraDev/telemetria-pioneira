//apps/backend/src/modules/etl/controllers/historical-load.controller.ts
import { HistoricalLoadService } from '@/services/historical-load.service.js';
import { logger } from '@/shared/utils/logger.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

export const startHistoricalLoadSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const jobIdParamSchema = z.object({
  jobId: z.string(),
});

export const listLoadsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
});

export class HistoricalLoadController {
  private historicalLoadService: HistoricalLoadService;

  constructor() {
    this.historicalLoadService = new HistoricalLoadService();
  }

  async startLoad(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { startDate, endDate } = request.body as z.infer<typeof startHistoricalLoadSchema>;

      logger.info('📥 Requisição de carga histórica', {
        userId: (request.user as any)?.id,
        startDate,
        endDate,
      });

      const result = await this.historicalLoadService.startHistoricalLoad({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      return reply.status(201).send({
        success: true,
        message: 'Carga histórica iniciada com sucesso',
        data: result,
      });
    } catch (error) {
      logger.error('Erro ao iniciar carga histórica:', error);
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao iniciar carga histórica',
      });
    }
  }

  async getLoadStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { jobId } = request.params as z.infer<typeof jobIdParamSchema>;

      const load = await this.historicalLoadService.getLoadStatus(jobId);

      return reply.send({
        success: true,
        message: 'Status obtido com sucesso',
        data: load,
      });
    } catch (error) {
      logger.error('Erro ao obter status da carga histórica:', error);
      return reply.status(404).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao obter status',
      });
    }
  }

  async listRecentLoads(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit } = request.query as z.infer<typeof listLoadsQuerySchema>;

      const loads = await this.historicalLoadService.listRecentLoads(limit);

      return reply.send({
        success: true,
        message: `${loads.length} cargas encontradas`,
        data: loads,
      });
    } catch (error) {
      logger.error('Erro ao listar cargas históricas:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro ao listar cargas históricas',
      });
    }
  }

  async cancelLoad(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { jobId } = request.params as z.infer<typeof jobIdParamSchema>;

      logger.info('🛑 Requisição de cancelamento de carga histórica', {
        userId: (request.user as any)?.id,
        jobId,
      });

      const result = await this.historicalLoadService.cancelLoad(jobId);

      return reply.send({
        success: true,
        message: 'Carga histórica cancelada com sucesso',
        data: result,
      });
    } catch (error) {
      logger.error('Erro ao cancelar carga histórica:', error);
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao cancelar carga',
      });
    }
  }
}
