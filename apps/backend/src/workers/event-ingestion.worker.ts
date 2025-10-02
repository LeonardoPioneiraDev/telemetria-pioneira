BigInt.prototype.toJSON = function () {
  return this.toString();
};

import { AppDataSource } from '@/data-source.js';
import { EtlControl } from '@/entities/etl-control.entity.js';
import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { EtlControlRepository } from '@/repositories/etl-control.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient, MixEvent } from '@/services/mix-api-client.service.js';
import { logger } from '@/shared/utils/logger.js';
import { delay, Queue } from 'bullmq';
import { DeepPartial } from 'typeorm';

const PROCESS_NAME = 'event_ingestion';

export class EventIngestionWorker {
  private mixApiClient: MixApiClient;
  private etlControlRepository: EtlControlRepository;
  private telemetryEventRepository: TelemetryEventRepository;
  private driverRepository: DriverRepository;
  private vehicleRepository: VehicleRepository;
  private eventTypeRepository: EventTypeRepository;
  private masterDataQueue: Queue;

  constructor(
    // Injeção de dependência para mantermos o código testável
    mixApiClient: MixApiClient,
    etlControlRepository: EtlControlRepository,
    telemetryEventRepository: TelemetryEventRepository,
    driverRepository: DriverRepository,
    vehicleRepository: VehicleRepository,
    eventTypeRepository: EventTypeRepository,
    masterDataQueue: Queue
  ) {
    this.mixApiClient = mixApiClient;
    this.etlControlRepository = etlControlRepository;
    this.telemetryEventRepository = telemetryEventRepository;
    this.driverRepository = driverRepository;
    this.vehicleRepository = vehicleRepository;
    this.eventTypeRepository = eventTypeRepository;
    this.masterDataQueue = masterDataQueue;
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
          /* ... (lógica de erro da API) */
        }

        // ✅ PASSO 1: O _processEventsBatch agora faz todo o trabalho de filtragem
        const newEventsToCreate = await this._processEventsBatch(response.events);

        // ✅ PASSO 2: A transação agora só lida com a escrita atômica
        await AppDataSource.transaction(async transactionalEntityManager => {
          if (newEventsToCreate.length > 0) {
            await transactionalEntityManager
              .getRepository(TelemetryEvent)
              .save(newEventsToCreate, { chunk: 200 });

            // Dispara a sincronização apenas para os eventos que foram efetivamente criados
            this.triggerMasterDataSyncForMissing(
              newEventsToCreate.map(e => e.raw_data as MixEvent)
            );
          }

          // Atualizamos o token DENTRO da mesma transação, garantindo consistência
          const controlRepo = transactionalEntityManager.getRepository(EtlControl);
          await controlRepo.update(
            { process_name: PROCESS_NAME },
            { last_successful_sincetoken: response.nextSinceToken }
          );
        });

        if (newEventsToCreate.length > 0) {
          logger.info(`✅ ${newEventsToCreate.length} novos eventos foram salvos no banco.`);
        }

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
   * ESTE MÉTODO AGORA É SÍNCRONO E PURO.
   * Ele apenas recebe uma lista de eventos, remove duplicatas e retorna
   * a lista pronta para ser salva, sem I/O.
   */
  private async _processEventsBatch(events: MixEvent[]): Promise<DeepPartial<TelemetryEvent>[]> {
    // 1. Remove duplicatas internas do lote
    const uniqueEventsMap = new Map<string, MixEvent>();
    for (const event of events) {
      uniqueEventsMap.set(event.EventId, event);
    }
    const uniqueEvents = Array.from(uniqueEventsMap.values());

    if (uniqueEvents.length === 0) return [];

    // 2. Verifica contra o banco de dados
    const incomingExternalIds = uniqueEvents.map(event => BigInt(event.EventId));
    const existingExternalIds =
      await this.telemetryEventRepository.findExistingExternalIds(incomingExternalIds);
    const existingIdsSet = new Set(existingExternalIds);

    // 3. Filtra para obter apenas os eventos realmente novos
    const newEvents = uniqueEvents.filter(event => !existingIdsSet.has(BigInt(event.EventId)));

    logger.info(
      `Filtragem de duplicatas: ${events.length} recebidos, ${uniqueEvents.length} únicos, ${newEvents.length} são novos.`
    );

    // 4. Mapeia apenas os novos eventos para o formato de entidade
    return newEvents.map(event => ({
      external_id: BigInt(event.EventId),
      event_timestamp: event.StartDateTime,
      latitude: event.StartPosition?.Latitude,
      longitude: event.StartPosition?.Longitude,
      speed: event.StartPosition?.SpeedKilometresPerHour,
      location_description: event.StartPosition?.FormattedAddress,
      raw_data: event,
      driver_external_id: event.DriverId ? BigInt(event.DriverId) : null,
      vehicle_external_id: event.AssetId ? BigInt(event.AssetId) : null,
      event_type_external_id: event.EventTypeId ? BigInt(event.EventTypeId) : null,
    }));
  }

  /**
   * Verifica quais dados mestres (veículo, motorista, etc.) não existem
   * no banco e dispara um job para o worker de sincronização.
   */
  private async triggerMasterDataSyncForMissing(newEvents: MixEvent[]): Promise<void> {
    try {
      // 1. Coletar todos os IDs externos únicos do lote
      const vehicleIds = [...new Set(newEvents.map(e => e.AssetId).filter(Boolean))];
      const driverIds = [...new Set(newEvents.map(e => e.DriverId).filter(Boolean))];
      const eventTypeIds = [...new Set(newEvents.map(e => e.EventTypeId).filter(Boolean))];

      // 2. Buscar no banco quais desses IDs já existem
      const [existingVehicles, existingDrivers, existingEventTypes] = await Promise.all([
        this.vehicleRepository.findByExternalIds(vehicleIds),
        this.driverRepository.findByExternalIds(driverIds),
        this.eventTypeRepository.findByExternalIds(eventTypeIds),
      ]);

      const existingVehicleIds = new Set(existingVehicles.map(v => v.external_id));
      const existingDriverIds = new Set(existingDrivers.map(d => d.external_id));
      const existingEventTypeIds = new Set(existingEventTypes.map(e => e.external_id));

      // 3. Identificar se há algum ID faltando
      const hasMissingVehicles = vehicleIds.some(id => !existingVehicleIds.has(id));
      const hasMissingDrivers = driverIds.some(id => !existingDriverIds.has(id));
      const hasMissingEventTypes = eventTypeIds.some(id => !existingEventTypeIds.has(id));

      if (hasMissingVehicles || hasMissingDrivers || hasMissingEventTypes) {
        logger.info('IDs de dados mestres não encontrados. Disparando job de sincronização...');

        // 4. Disparar um único job para o worker 'master-data-sync'
        // Usamos um ID de job fixo para evitar duplicatas em um curto espaço de tempo
        await this.masterDataQueue.add(
          'sync-all-master-data',
          {},
          {
            jobId: 'sync-on-demand',
            removeOnComplete: true, // Limpa o job da fila após o sucesso
            removeOnFail: true,
          }
        );
      }
    } catch (error) {
      logger.error('Falha ao disparar o job de sincronização de dados mestres.', error);
    }
  }
}
