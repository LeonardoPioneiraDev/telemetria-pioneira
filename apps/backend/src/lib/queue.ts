import { environment } from '@/config/environment.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue } from 'bullmq';
import 'dotenv/config';

// Configuração da conexão com o Redis a partir do nosso environment
const connection = {
  host: environment.redis.host,
  port: environment.redis.port,
};

// Criamos uma fila nomeada para a sincronização de dados de apoio
export const masterDataSyncQueue = new Queue('master-data-sync', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Tenta executar o job até 3 vezes em caso de falha
    backoff: {
      type: 'exponential',
      delay: 5000, // Espera 5 segundos antes da primeira retentativa
    },
  },
});

masterDataSyncQueue.on('error', error => {
  logger.error('❌ Erro na fila master-data-sync:', error);
});
