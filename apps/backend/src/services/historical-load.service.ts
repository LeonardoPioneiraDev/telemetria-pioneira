import { environment } from '@/config/environment.js';
import { HistoricalLoadControlRepository } from '@/repositories/historical-load-control.repository.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue } from 'bullmq';

export interface StartHistoricalLoadParams {
  startDate: Date;
  endDate: Date;
}

export class HistoricalLoadService {
  private historicalLoadQueue: Queue;
  private historicalLoadRepo: HistoricalLoadControlRepository;

  constructor() {
    const connection = {
      host: environment.redis.host,
      port: environment.redis.port,
    };

    this.historicalLoadQueue = new Queue('historical-data-load', { connection });
    this.historicalLoadRepo = new HistoricalLoadControlRepository();
  }

  async startHistoricalLoad(params: StartHistoricalLoadParams) {
    const { startDate, endDate } = params;

    // Validações
    if (startDate >= endDate) {
      throw new Error('Data inicial deve ser anterior à data final');
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 24 * 90) {
      // Máximo 90 dias
      throw new Error('Período máximo permitido: 90 dias');
    }

    // Verifica se já existe uma carga ativa
    const activeLoads = await this.historicalLoadRepo.findAllActive();
    if (activeLoads.length > 0) {
      throw new Error('Já existe uma carga histórica em andamento');
    }

    // Calcula total de horas
    const totalHours = Math.ceil(diffHours);

    // Cria job ID único
    const jobId = `historical-${Date.now()}`;

    // Cria registro de controle
    await this.historicalLoadRepo.createLoad({
      job_id: jobId,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      total_hours: totalHours,
      hours_processed: 0,
      events_processed: 0,
    });

    // Adiciona job na fila
    await this.historicalLoadQueue.add(
      'load-historical-data',
      {
        jobId,
        startDate,
        endDate,
      },
      {
        jobId,
        removeOnComplete: false, // Mantém histórico
        removeOnFail: false,
      }
    );

    logger.info('✅ Carga histórica iniciada', {
      jobId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalHours,
    });

    return {
      jobId,
      startDate,
      endDate,
      totalHours,
      status: 'pending',
    };
  }

  async getLoadStatus(jobId: string) {
    const load = await this.historicalLoadRepo.findByJobId(jobId);
    if (!load) {
      throw new Error('Carga histórica não encontrada');
    }
    return load;
  }

  async listRecentLoads(limit: number = 10) {
    return this.historicalLoadRepo.findRecent(limit);
  }

  async cancelLoad(jobId: string) {
    const load = await this.historicalLoadRepo.findByJobId(jobId);
    if (!load) {
      throw new Error('Carga histórica não encontrada');
    }

    if (load.status === 'completed') {
      throw new Error('Não é possível cancelar uma carga já concluída');
    }

    // Remove job da fila
    const job = await this.historicalLoadQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }

    // Atualiza status
    await this.historicalLoadRepo.updateStatus(jobId, 'cancelled');

    logger.info('🛑 Carga histórica cancelada', { jobId });

    return { jobId, status: 'cancelled' };
  }
}
