import { eventIngestionQueue, masterDataSyncQueue } from '@/lib/queue.js';
import { logger } from '@/shared/utils/logger.js';
import cron from 'node-cron';

export class Scheduler {
  public static start(): void {
    logger.info('⏰ Agendador de tarefas iniciado.');

    // Agenda a tarefa para rodar todos os dias às 02:00 da manhã
    // Formato Cron: (minuto hora dia-do-mês mês dia-da-semana)
    cron.schedule('0 2 * * *', async () => {
      logger.info('🗓️ Adicionando job de sincronização de dados de apoio à fila...');

      // Adiciona um job à fila. O nome 'sync-master-data' é um identificador.
      // O { removeOnComplete: true } diz para o BullMQ limpar o job da lista após o sucesso.
      await masterDataSyncQueue.add('sync-master-data-daily', {}, { removeOnComplete: true });
    });

    cron.schedule('* * * * *', async () => {
      // Lógica para evitar enfileirar um novo job se já houver um rodando ou esperando
      const waitingCount = await eventIngestionQueue.getWaitingCount();
      const activeCount = await eventIngestionQueue.getActiveCount();

      if (waitingCount > 0 || activeCount > 0) {
        logger.warn('⚠️ Job de ingestão de eventos já está na fila. Pulando este ciclo.');
        return;
      }

      logger.info('🗓️ Adicionando job de ingestão de eventos à fila...');
      await eventIngestionQueue.add('ingest-new-events', {}, { removeOnComplete: true });
    });
  }
}
