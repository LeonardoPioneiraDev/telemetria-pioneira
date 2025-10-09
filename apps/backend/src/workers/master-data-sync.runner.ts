import { environment } from '@/config/environment.js';
import { initializeDataSource } from '@/data-source.js';
import { logger } from '@/shared/utils/logger.js';
import { ConnectionOptions, Worker } from 'bullmq';

// Importando a LÓGICA do worker e suas dependências
import { DriverRepository } from '@/repositories/driver.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient } from '@/services/mix-api-client.service.js';
import { MasterDataSyncWorker } from './master-data-sync.worker.js';

const connection: ConnectionOptions = {
  host: environment.redis.host,
  port: environment.redis.port,
};

if (environment.redis.password) {
  connection.password = environment.redis.password;
}

async function startWorker() {
  try {
    await initializeDataSource();
    logger.info('▶️  Iniciando Worker para a fila "master-data-sync"...');

    // Instanciando todas as dependências necessárias
    const driverRepo = new DriverRepository();
    const vehicleRepo = new VehicleRepository();
    const eventTypeRepo = new EventTypeRepository();
    const apiClient = new MixApiClient();

    // Este é o processo que escuta a fila do BullMQ
    const worker = new Worker(
      'master-data-sync',
      async job => {
        logger.info(`🔄 Processando job #${job.id} de sincronização de dados de apoio.`);

        // Injeta as dependências e executa a LÓGICA
        const syncWorker = new MasterDataSyncWorker(
          driverRepo,
          vehicleRepo,
          eventTypeRepo,
          apiClient
        );

        await syncWorker.run();
        return { status: 'Completed' };
      },
      { connection, lockDuration: 300000 }
    );

    worker.on('completed', job => logger.info(`✅ Job de dados de apoio #${job.id} concluído.`));
    worker.on('failed', (job, err) =>
      logger.error(`❌ Job de dados de apoio #${job?.id} falhou:`, err)
    );
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar o worker de dados de apoio:', error);
    process.exit(1);
  }
}

startWorker();
