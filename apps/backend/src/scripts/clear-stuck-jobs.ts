import { environment } from '@/config/environment.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue } from 'bullmq';

const connection = {
  host: environment.redis.host,
  port: environment.redis.port,
};

async function clearStuckJobs() {
  try {
    logger.info('🧹 Iniciando limpeza de jobs travados...');

    const eventQueue = new Queue('event-ingestion', { connection });
    const masterQueue = new Queue('master-data-sync', { connection });

    // ========== LIMPAR EVENT-INGESTION ==========

    // Jobs ativos (podem estar travados)
    const activeEvents = await eventQueue.getActive();
    logger.info(`📋 ${activeEvents.length} jobs ativos em 'event-ingestion'`);

    if (activeEvents.length > 0) {
      for (const job of activeEvents) {
        const timeSinceUpdate = Date.now() - (job.processedOn || job.timestamp);

        // Se o job está ativo há mais de 2 minutos, consideramos travado
        if (timeSinceUpdate > 120000) {
          await job.remove();
          logger.warn(
            `❌ Removido job travado #${job.id} (ativo há ${Math.round(timeSinceUpdate / 1000)}s)`
          );
        }
      }
    }

    // Jobs aguardando
    const waitingEvents = await eventQueue.getWaiting();
    logger.info(`📋 ${waitingEvents.length} jobs aguardando em 'event-ingestion'`);

    // Jobs falhados
    const failedEvents = await eventQueue.getFailed();
    logger.info(`📋 ${failedEvents.length} jobs falhados em 'event-ingestion'`);

    const shouldCleanFailed = process.argv.includes('--failed');
    if (shouldCleanFailed && failedEvents.length > 0) {
      for (const job of failedEvents) {
        await job.remove();
        logger.info(`❌ Removido job falhado #${job.id}`);
      }
    }

    // Jobs completados (opcional - para limpar histórico)
    const completedEvents = await eventQueue.getCompleted();
    logger.info(`📋 ${completedEvents.length} jobs completados em 'event-ingestion'`);

    if (process.argv.includes('--clean-all')) {
      await eventQueue.clean(0, 1000, 'completed');
      await eventQueue.clean(0, 1000, 'failed');
      logger.info('🧹 Histórico completo limpo (completed + failed)');
    }

    // ========== LIMPAR MASTER-DATA-SYNC ==========

    const activeMaster = await masterQueue.getActive();
    logger.info(`📋 ${activeMaster.length} jobs ativos em 'master-data-sync'`);

    if (activeMaster.length > 0) {
      for (const job of activeMaster) {
        const timeSinceUpdate = Date.now() - (job.processedOn || job.timestamp);

        if (timeSinceUpdate > 300000) {
          // 5 minutos para master data
          await job.remove();
          logger.warn(`❌ Removido job travado #${job.id} de master-data-sync`);
        }
      }
    }

    await eventQueue.close();
    await masterQueue.close();

    logger.info('✅ Limpeza concluída!');
    logger.info('');
    logger.info('💡 Dicas:');
    logger.info('   • Use --failed para remover jobs falhados');
    logger.info('   • Use --clean-all para limpar TODO o histórico');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro na limpeza:', error);
    process.exit(1);
  }
}

clearStuckJobs();
