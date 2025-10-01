BigInt.prototype.toJSON = function () {
  return this.toString();
};
import { environment } from '@/config/environment.js';
import { initializeDataSource } from '@/data-source.js';
import { logger } from '@/shared/utils/logger.js';
import { Worker } from 'bullmq';
import { MasterDataSyncWorker } from './master-data-sync.worker.js';

// IMPORTAMOS TUDO QUE O WORKER PRECISA
import { DriverRepository } from '@/repositories/driver.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient } from '@/services/mix-api-client.service.js';

const connection = {
  host: environment.redis.host,
  port: environment.redis.port,
};

async function startWorker() {
  try {
    await initializeDataSource();
    logger.info('▶️  Iniciando Worker para a fila "master-data-sync"...');

    // 1. CRIAMOS AS INSTÂNCIAS DAS DEPENDÊNCIAS AQUI FORA
    const driverRepo = new DriverRepository();
    const vehicleRepo = new VehicleRepository();
    const eventTypeRepo = new EventTypeRepository();
    const apiClient = new MixApiClient();

    const worker = new Worker(
      'master-data-sync',
      async job => {
        logger.info(`🔄 Processando job #${job.id} da fila ${job.queueName}`);

        // 2. INJETAMOS AS INSTÂNCIAS NO CONSTRUTOR DO WORKER
        const syncWorker = new MasterDataSyncWorker(
          driverRepo,
          vehicleRepo,
          eventTypeRepo,
          apiClient
        );

        await syncWorker.run();
        return { status: 'Completed' };
      },
      { connection }
    );

    worker.on('completed', job => {
      logger.info(`✅ Job #${job.id} concluído com sucesso.`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`❌ Job #${job?.id} falhou:`, err);
    });
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar o worker runner:', error);
    process.exit(1);
  }
}

startWorker();
