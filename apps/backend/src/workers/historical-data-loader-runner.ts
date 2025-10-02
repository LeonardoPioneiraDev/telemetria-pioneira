import { environment } from '@/config/environment.js';
import { initializeDataSource } from '@/data-source.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue, Worker } from 'bullmq';

import { DriverRepository } from '@/repositories/driver.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { HistoricalLoadControlRepository } from '@/repositories/historical-load-control.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient } from '@/services/mix-api-client.service.js';
import {
  HistoricalDataLoaderWorker,
  HistoricalLoadJobData,
} from './historical-data-loader.worker.js';

const connection = {
  host: environment.redis.host,
  port: environment.redis.port,
};

async function startWorker() {
  try {
    await initializeDataSource();
    logger.info('✅ Conexão do TypeORM estabelecida!');

    logger.info('▶️  Iniciando Worker de Carga Histórica...');

    // Instancia dependências
    const apiClient = new MixApiClient();
    const historicalLoadRepo = new HistoricalLoadControlRepository();
    const telemetryEventRepo = new TelemetryEventRepository();
    const driverRepo = new DriverRepository();
    const vehicleRepo = new VehicleRepository();
    const eventTypeRepo = new EventTypeRepository();
    const masterDataQueue = new Queue('master-data-sync', { connection });

    let currentWorkerInstance: HistoricalDataLoaderWorker | null = null;

    const worker = new Worker<HistoricalLoadJobData>(
      'historical-data-load',
      async job => {
        const jobStartTime = Date.now();
        logger.info(`🔄 Processando job de carga histórica #${job.id}`);

        try {
          const loaderWorker = new HistoricalDataLoaderWorker(
            apiClient,
            historicalLoadRepo,
            telemetryEventRepo,
            driverRepo,
            vehicleRepo,
            eventTypeRepo,
            masterDataQueue
          );

          currentWorkerInstance = loaderWorker;

          await loaderWorker.run(job.data);

          const duration = Date.now() - jobStartTime;
          logger.info(
            `✅ Job de carga histórica #${job.id} concluído em ${Math.round(duration / 1000 / 60)}min`
          );

          currentWorkerInstance = null;

          return {
            status: 'Completed',
            duration: `${duration}ms`,
          };
        } catch (error) {
          currentWorkerInstance = null;
          const duration = Date.now() - jobStartTime;
          logger.error(
            `❌ Job de carga histórica #${job.id} falhou após ${Math.round(duration / 1000)}s`,
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
          throw error;
        }
      },
      {
        connection,
        lockDuration: 14400000, // 4 horas (tempo máximo estimado)
        stalledInterval: 60000, // Verifica stall a cada 1 minuto
        maxStalledCount: 3,
        concurrency: 1, // Apenas 1 carga histórica por vez
      }
    );

    worker.on('completed', job => {
      logger.info(`✅ Job de carga histórica #${job.id} concluído.`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`❌ Job de carga histórica #${job?.id} falhou:`, {
        error: err.message,
      });
    });

    worker.on('stalled', jobId => {
      logger.warn(`⚠️ Job de carga histórica #${jobId} travado. Será recuperado automaticamente.`);
    });

    worker.on('error', err => {
      logger.error('❌ Erro no worker de carga histórica:', err);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`🛑 Sinal ${signal} recebido. Encerrando worker de carga histórica...`);

      try {
        await worker.pause();

        if (currentWorkerInstance) {
          currentWorkerInstance.stop();
          logger.info('⏸️ Solicitado parada da carga histórica em andamento...');

          // Aguarda até 10 segundos
          let waited = 0;
          while (currentWorkerInstance && waited < 10000) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waited += 100;
          }
        }

        await worker.close(true, 30000);
        await masterDataQueue.close();

        logger.info('✅ Worker de carga histórica encerrado com sucesso');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Erro ao encerrar worker de carga histórica:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

    logger.info('✅ Worker de carga histórica pronto e aguardando jobs!');
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar worker de carga histórica:', error);
    process.exit(1);
  }
}

startWorker();
