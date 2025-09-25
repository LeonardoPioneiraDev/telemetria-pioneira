import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { EtlControlRepository } from '@/repositories/etl-control.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { MixApiClient, MixEvent } from '@/services/mix-api-client.service.js';
import { logger } from '@/shared/utils/logger.js';
import { delay } from 'bullmq';
import { DeepPartial } from 'typeorm';

const PROCESS_NAME = 'event_ingestion';

export class EventIngestionWorker {
  private mixApiClient: MixApiClient;
  private etlControlRepository: EtlControlRepository;
  private telemetryEventRepository: TelemetryEventRepository;

  constructor(
    // Injeção de dependência para mantermos o código testável
    mixApiClient: MixApiClient,
    etlControlRepository: EtlControlRepository,
    telemetryEventRepository: TelemetryEventRepository
  ) {
    this.mixApiClient = mixApiClient;
    this.etlControlRepository = etlControlRepository;
    this.telemetryEventRepository = telemetryEventRepository;
  }

  async run(): Promise<void> {
    logger.info('🚀 Iniciando worker de ingestão de eventos...');
    try {
      const control = await this.etlControlRepository.findByProcessName(PROCESS_NAME);
      let currentToken = control?.last_successful_sincetoken || 'NEW';
      let hasMoreItems = true;

      logger.info(`Iniciando busca de eventos com o token: ${currentToken}`);

      do {
        const response = await this.mixApiClient.getEventsSince(currentToken);

        if (!response) {
          // Se a API falhar em responder, paramos para evitar problemas.
          logger.error('Não foi possível obter resposta da API MiX. Abortando ciclo atual.');
          hasMoreItems = false;
          continue; // Pula para a próxima iteração (que sairá do loop)
        }

        if (response.events.length > 0) {
          logger.info(`Recebidos ${response.events.length} eventos. Processando...`);
          await this._processEventsBatch(response.events);
        } else {
          logger.info('Nenhum evento novo encontrado nesta página.');
        }

        // Salvamos o progresso (o próximo token) no banco de dados a cada iteração.
        await this.etlControlRepository.updateToken(PROCESS_NAME, response.nextSinceToken);
        logger.debug(`Token de controle atualizado no banco para: ${response.nextSinceToken}`);

        currentToken = response.nextSinceToken;
        hasMoreItems = response.hasMoreItems;

        if (hasMoreItems) {
          logger.debug('Mais páginas para buscar, aguardando...');
          await delay(5100);
        }
      } while (hasMoreItems);

      logger.info('✅ Worker de ingestão de eventos concluiu com sucesso (sem mais páginas).');
    } catch (error) {
      logger.error('❌ Erro durante a execução do worker de ingestão de eventos.', error);
      throw error;
    }
  }

  /**
   * Processa um lote de eventos recebidos da API.
   */
  private async _processEventsBatch(events: MixEvent[]): Promise<void> {
    // 1. Pega os IDs de todos os eventos que recebemos da API
    const incomingExternalIds = events.map(event => event.EventId);

    // 2. Pergunta ao banco quais desses IDs ele JÁ POSSUI
    const existingExternalIds =
      await this.telemetryEventRepository.findExistingExternalIds(incomingExternalIds);
    const existingIdsSet = new Set(existingExternalIds);

    // 3. Filtra a lista, mantendo apenas os eventos que NÃO existem no banco
    const newEvents = events.filter(event => !existingIdsSet.has(event.EventId));

    if (newEvents.length === 0) {
      logger.info('Todos os eventos recebidos já existem no banco de dados. Nada a ser inserido.');
      return;
    }

    logger.info(
      `Filtragem de duplicatas: ${events.length} recebidos, ${newEvents.length} são novos.`
    );

    // 4. Mapeia e cria apenas os eventos realmente novos
    const eventsToCreate: DeepPartial<TelemetryEvent>[] = newEvents.map(event => ({
      external_id: event.EventId,
      driver_external_id: event.DriverId,
      vehicle_external_id: event.AssetId,
      event_type_external_id: event.EventTypeId,
      occurred_at: event.StartDateTime,
      latitude: event.StartPosition?.Latitude,
      longitude: event.StartPosition?.Longitude,
      speed_kmh: event.StartPosition?.SpeedKilometresPerHour,
      speed_limit_kmh: event.StartPosition?.SpeedLimit,
      odometer_km: event.StartOdometerKilometres,
      value: event.Value,
      raw_data: event,
    }));

    if (eventsToCreate.length > 0) {
      await this.telemetryEventRepository.bulkCreate(eventsToCreate);
      logger.info(`${eventsToCreate.length} novos eventos foram salvos no banco.`);
    }
  }
}
