import { environment } from '@/config/environment.js';
import { logger } from '@/shared/utils/logger.js';
import { ConnectionOptions, Queue } from 'bullmq';
import 'dotenv/config';

const connection: ConnectionOptions = {
  host: environment.redis.host,
  port: environment.redis.port,
};

if (environment.redis.password) {
  connection.password = environment.redis.password;
}

// Fila para sincronização de dados de apoio (baixa frequência)
export const masterDataSyncQueue = new Queue('master-data-sync', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const eventIngestionQueue = new Queue('event-ingestion', {
  connection,
  defaultJobOptions: {
    attempts: 2, // Menos tentativas para jobs de alta frequência
    backoff: { type: 'exponential', delay: 10000 },
  },
});

masterDataSyncQueue.on('error', error => logger.error('❌ Erro na fila master-data-sync:', error));
eventIngestionQueue.on('error', error => logger.error('❌ Erro na fila event-ingestion:', error));
