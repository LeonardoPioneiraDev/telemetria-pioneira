//apps/backend/src/modules/etl/controllers/etl-monitoring.controller.ts
import { EtlMonitoringService } from '@/services/etl-monitoring.service.js';
import { logger } from '@/shared/utils/logger.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { historyQuerySchema, metricsQuerySchema } from '../schemas/etl-monitoring.schema.js';

export class EtlMonitoringController {
  private etlMonitoringService: EtlMonitoringService;

  constructor() {
    this.etlMonitoringService = new EtlMonitoringService();
  }

  public async getStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      logger.info('📊 Requisição de status do ETL', {
        userId: (request.user as any)?.id,
        userRole: (request.user as any)?.role,
      });

      const status = await this.etlMonitoringService.getStatus();

      return reply.send({
        success: true,
        message: 'Status do ETL obtido com sucesso',
        data: status,
      });
    } catch (error) {
      logger.error('Erro ao obter status do ETL:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro ao obter status do ETL',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  public async getMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { days } = request.query as z.infer<typeof metricsQuerySchema>;

      logger.info('📈 Requisição de métricas do ETL', {
        userId: (request.user as any)?.id,
        days,
      });

      const metrics = await this.etlMonitoringService.getMetrics(days);

      return reply.send({
        success: true,
        message: `Métricas dos últimos ${days} dias obtidas com sucesso`,
        data: metrics,
      });
    } catch (error) {
      logger.error('Erro ao obter métricas do ETL:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro ao obter métricas do ETL',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  public async getHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit } = request.query as z.infer<typeof historyQuerySchema>;

      logger.info('📜 Requisição de histórico do ETL', {
        userId: (request.user as any)?.id,
        limit,
      });

      const history = await this.etlMonitoringService.getHistory(limit);

      return reply.send({
        success: true,
        message: `Últimas ${history.length} execuções obtidas com sucesso`,
        data: history,
      });
    } catch (error) {
      logger.error('Erro ao obter histórico do ETL:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro ao obter histórico do ETL',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  public async getHealth(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = await this.etlMonitoringService.getStatus();

      const isHealthy = status.status === 'running' || status.status === 'idle';

      const statusCode = isHealthy ? 200 : 503;

      return reply.status(statusCode).send({
        success: isHealthy,
        message: isHealthy ? 'ETL operando normalmente' : 'ETL com problemas',
        data: {
          status: status.status,
          lastSyncAge: status.lastSync?.ageInMinutes,
          tokenExpiringSoon: status.tokenInfo.isExpiringSoon,
          workersActive: status.workers.eventIngestion.active > 0,
        },
      });
    } catch (error) {
      logger.error('Erro no health check do ETL:', error);
      return reply.status(503).send({
        success: false,
        message: 'Erro ao verificar saúde do ETL',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
}
