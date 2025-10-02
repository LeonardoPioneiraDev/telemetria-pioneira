import { environment } from '@/config/environment.js';
import { initializeDataSource } from '@/data-source.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue, Worker } from 'bullmq';

// Importando a lógica do worker e TODAS as suas dependências
import { DriverRepository } from '@/repositories/driver.repository.js';
import { EtlControlRepository } from '@/repositories/etl-control.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient } from '@/services/mix-api-client.service.js';
import { EventIngestionWorker } from './event-ingestion.worker.js';

const connection = {
  host: environment.redis.host,
  port: environment.redis.port,
};

async function startWorker() {
  try {
    logger.info('🔌 Conectando ao banco de dados...');
    await initializeDataSource();
    logger.info('✅ Conexão do TypeORM estabelecida!');

    logger.info('🔌 Conectando ao Redis...');
    // Testa a conexão com Redis antes de criar o worker
    const testQueue = new Queue('test-connection', { connection });
    await testQueue.waitUntilReady();
    await testQueue.close();
    logger.info('✅ Conexão com Redis estabelecida!');

    logger.info('▶️  Iniciando Worker para a fila "event-ingestion"...');

    // 1. CRIAMOS AS INSTÂNCIAS DAS DEPENDÊNCIAS AQUI FORA (reutilizadas entre jobs)
    const apiClient = new MixApiClient();
    const etlControlRepo = new EtlControlRepository();
    const telemetryEventRepo = new TelemetryEventRepository();
    const driverRepo = new DriverRepository();
    const vehicleRepo = new VehicleRepository();
    const eventTypeRepo = new EventTypeRepository();
    const masterDataQueue = new Queue('master-data-sync', { connection });

    let currentIngestionWorker: EventIngestionWorker | null = null;

    const worker = new Worker(
      'event-ingestion',
      async job => {
        const jobStartTime = Date.now();
        logger.info(`🔄 Processando job #${job.id} de ingestão de eventos`);

        try {
          // 2. INJETAMOS AS INSTÂNCIAS NO CONSTRUTOR DO WORKER
          const ingestionWorker = new EventIngestionWorker(
            apiClient,
            etlControlRepo,
            telemetryEventRepo,
            driverRepo,
            vehicleRepo,
            eventTypeRepo,
            masterDataQueue
          );

          await ingestionWorker.run();

          const duration = Date.now() - jobStartTime;
          logger.info(`✅ Job #${job.id} concluído em ${Math.round(duration / 1000)}s`);
          currentIngestionWorker = null;

          return {
            status: 'Completed',
            duration: `${duration}ms`,
          };
        } catch (error) {
          const duration = Date.now() - jobStartTime;
          logger.error(`❌ Job #${job.id} falhou após ${Math.round(duration / 1000)}s`, {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      {
        connection,
        // ✅ CONFIGURAÇÕES OTIMIZADAS
        lockDuration: 60000, // 1 minuto (suficiente para a maioria dos ETLs)
        stalledInterval: 30000, // Verifica stall a cada 30s
        maxStalledCount: 2, // Permite até 2 stalls antes de falhar definitivamente

        // ✅ Configurações de concorrência
        concurrency: 1, // Apenas 1 job por vez (evita race conditions)

        // ✅ Limiter (proteção extra contra sobrecarga)
        limiter: {
          max: 1, // Máximo 1 job
          duration: 60000, // Por minuto
        },
      }
    );

    // Event listeners otimizados
    worker.on('completed', job => {
      logger.info(`✅ Job de ingestão #${job.id} concluído.`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`❌ Job de ingestão #${job?.id} falhou:`, {
        error: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'), // Apenas primeiras 3 linhas
      });
    });

    worker.on('stalled', jobId => {
      logger.warn(
        `⚠️ Job #${jobId} marcado como stalled (travado). Será recuperado automaticamente.`
      );
    });

    worker.on('error', err => {
      logger.error('❌ Erro no worker de ingestão:', err);
    });

    // ✅ Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`🛑 Sinal ${signal} recebido. Encerrando worker graciosamente...`);

      try {
        // 1. Para o worker de aceitar novos jobs
        await worker.pause();

        // 2. Para o ETL que está rodando agora
        if (currentIngestionWorker) {
          currentIngestionWorker.stop();
          logger.info('⏸️ Solicitado parada do ETL em andamento...');

          // Aguarda até 5 segundos para o ETL parar
          let waited = 0;
          while (currentIngestionWorker && waited < 5000) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waited += 100;
          }
        }

        // 3. Fecha o worker
        await worker.close(true, 10000); // força após 10s

        // 4. Fecha fila de master data
        await masterDataQueue.close();

        logger.info('✅ Worker encerrado com sucesso');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Erro ao encerrar worker:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

    logger.info('✅ Worker de ingestão pronto e aguardando jobs!');
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar o worker runner:', error);
    process.exit(1);
  }
}

startWorker();
