import { masterDataSyncQueue } from '@/lib/queue.js';
import { logger } from '@/shared/utils/logger.js';
import 'dotenv/config';

async function triggerJob() {
  logger.info('🚀 Acionando job de sincronização de dados de apoio manualmente...');

  await masterDataSyncQueue.add(
    'manual-sync-trigger',
    {},
    {
      removeOnComplete: true, // Limpa o job da fila após o sucesso
      removeOnFail: true, // Limpa o job da fila em caso de falha
    }
  );

  logger.info('✅ Job adicionado à fila com sucesso. Verifique o console do worker.');

  // Fecha a conexão com a fila para que o script termine
  await masterDataSyncQueue.close();
}

triggerJob().catch(error => {
  logger.error('❌ Erro ao acionar job manual:', error);
  process.exit(1);
});
