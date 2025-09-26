// apps/backend/src/modules/performance/controllers/performanceReportController.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  dateRangeQuerySchema,
  performanceReportParamsSchema,
  performanceReportQuerySchema,
} from '../schemas/performanceReport.schema.js';
import {
  InvalidDateRangeError,
  PerformanceReportService,
} from '../services/performanceReportService.js';

export class PerformanceReportController {
  private performanceReportService: PerformanceReportService;

  constructor() {
    this.performanceReportService = new PerformanceReportService();
  }

  public async getPerformanceReport(
    request: FastifyRequest<{
      Params: z.infer<typeof performanceReportParamsSchema>;
      Querystring: z.infer<typeof performanceReportQuerySchema>;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { driverId } = request.params;
      const { reportDate, periodDays } = request.query;

      const report = await this.performanceReportService.generatePerformanceReport(
        driverId,
        reportDate,
        periodDays
      );

      return reply.send(report);
    } catch (error) {
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.status(404).send({ message: error.message });
      }
      throw error;
    }
  }

  public async getPerformanceReportByDateRange(
    request: FastifyRequest<{
      Params: z.infer<typeof performanceReportParamsSchema>;
      Querystring: z.infer<typeof dateRangeQuerySchema>;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { driverId } = request.params;
      const { startDate, endDate } = request.query;

      const report = await this.performanceReportService.generatePerformanceReportByDateRange(
        driverId,
        startDate,
        endDate
      );

      return reply.send(report);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('não encontrado')) {
          return reply.status(404).send({ message: error.message });
        }
        if (error instanceof InvalidDateRangeError) {
          // ✅ Captura o erro de intervalo de data
          return reply.status(400).send({ message: error.message });
        }
      }
      throw error;
    }
  }
}

// Exportar schemas para uso nas rotas
export { dateRangeQuerySchema, performanceReportParamsSchema, performanceReportQuerySchema };
