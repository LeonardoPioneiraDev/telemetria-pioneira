import { environment } from '@/config/environment.js';
import { initializeDataSource } from '@/data-source.js';
import { logger } from '@/shared/utils/logger.js';
import { Worker } from 'bullmq';

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
    await initializeDataSource();
    logger.info('▶️  Iniciando Worker para a fila "event-ingestion"...');

    // Instanciando todas as dependências necessárias
    const apiClient = new MixApiClient();
    const etlControlRepo = new EtlControlRepository();
    const telemetryEventRepo = new TelemetryEventRepository();
    const driverRepo = new DriverRepository();
    const vehicleRepo = new VehicleRepository();
    const eventTypeRepo = new EventTypeRepository();

    const worker = new Worker(
      'event-ingestion',
      async job => {
        logger.info(`🔄 Processando job #${job.id} de ingestão de eventos`);

        // Injetando as dependências no construtor do worker
        const ingestionWorker = new EventIngestionWorker(
          apiClient,
          etlControlRepo,
          telemetryEventRepo,
          driverRepo,
          vehicleRepo,
          eventTypeRepo
        );

        await ingestionWorker.run();
        return { status: 'Completed' };
      },
      { connection }
    );

    worker.on('completed', job => logger.info(`✅ Job de ingestão #${job.id} concluído.`));
    worker.on('failed', (job, err) => logger.error(`❌ Job de ingestão #${job?.id} falhou:`, err));
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar o worker de ingestão:', error);
    process.exit(1);
  }
}

startWorker();
