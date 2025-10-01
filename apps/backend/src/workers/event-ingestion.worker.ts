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

  // async run(): Promise<void> {
  //   logger.info('🚀 Iniciando worker de ingestão de eventos...');
  //   try {
  //     const control = await this.etlControlRepository.findByProcessName(PROCESS_NAME);
  //     let currentToken = control?.last_successful_sincetoken || 'NEW';
  //     let hasMoreItems = true;

  //     logger.info(`Iniciando busca de eventos com o token: ${currentToken}`);

  //     do {
  //       const response = await this.mixApiClient.getEventsSince(currentToken);

  //       if (!response) {
  //         // Se a API falhar em responder, paramos para evitar problemas.
  //         logger.error('Não foi possível obter resposta da API MiX. Abortando ciclo atual.');
  //         hasMoreItems = false;
  //         continue; // Pula para a próxima iteração (que sairá do loop)
  //       }

  //       if (response.events.length > 0) {
  //         logger.info(`Recebidos ${response.events.length} eventos. Processando...`);
  //         await this._processEventsBatch(response.events);
  //       } else {
  //         logger.info('Nenhum evento novo encontrado nesta página.');
  //       }

  //       // Salvamos o progresso (o próximo token) no banco de dados a cada iteração.
  //       await this.etlControlRepository.updateToken(PROCESS_NAME, response.nextSinceToken);
  //       logger.debug(`Token de controle atualizado no banco para: ${response.nextSinceToken}`);

  //       currentToken = response.nextSinceToken;
  //       hasMoreItems = response.hasMoreItems;

  //       if (hasMoreItems) {
  //         logger.debug('Mais páginas para buscar, aguardando...');
  //         await delay(5100);
  //       }
  //     } while (hasMoreItems);

  //     logger.info('✅ Worker de ingestão de eventos concluiu com sucesso (sem mais páginas).');
  //   } catch (error) {
  //     logger.error('❌ Erro durante a execução do worker de ingestão de eventos.', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Processa um lote de eventos recebidos da API.
  //  */
  // private async _processEventsBatch(events: MixEvent[]): Promise<void> {
  //   const uniqueEventsMap = new Map<string, MixEvent>();
  //   for (const event of events) {
  //     uniqueEventsMap.set(event.EventId, event);
  //   }
  //   const uniqueEvents = Array.from(uniqueEventsMap.values());

  //   if (events.length !== uniqueEvents.length) {
  //     logger.warn(
  //       `Lote de eventos continha duplicatas internas. Recebidos: ${events.length}, únicos: ${uniqueEvents.length}`
  //     );
  //   }

  //   const incomingExternalIds = uniqueEvents.map(event => BigInt(event.EventId));

  //   if (incomingExternalIds.length === 0) {
  //     logger.info('Nenhum evento válido para processar após a de-duplicação.');
  //     return;
  //   }

  //   const existingExternalIds =
  //     await this.telemetryEventRepository.findExistingExternalIds(incomingExternalIds);
  //   const existingIdsSet = new Set(existingExternalIds);
  //   const newEvents = uniqueEvents.filter(event => !existingIdsSet.has(BigInt(event.EventId)));

  //   if (newEvents.length === 0) {
  //     logger.info('Todos os eventos recebidos já existem no banco. Nada a ser inserido.');
  //     return;
  //   }
  //   logger.info(
  //     `Filtragem de duplicatas: ${uniqueEvents.length} únicos recebidos, ${newEvents.length} são novos.`
  //   );

  //   // Etapa 2: Mapear e salvar
  //   const eventsToCreate: DeepPartial<TelemetryEvent>[] = newEvents.map(event => {
  //     return {
  //       external_id: BigInt(event.EventId),
  //       event_timestamp: event.StartDateTime,
  //       latitude: event.StartPosition?.Latitude,
  //       longitude: event.StartPosition?.Longitude,
  //       speed: event.StartPosition?.SpeedKilometresPerHour,
  //       location_description: event.StartPosition?.FormattedAddress,
  //       raw_data: event,
  //       driver_external_id: event.DriverId ? BigInt(event.DriverId) : null,
  //       vehicle_external_id: event.AssetId ? BigInt(event.AssetId) : null,
  //       event_type_external_id: event.EventTypeId ? BigInt(event.EventTypeId) : null,
  //     };
  //   });

  //   if (eventsToCreate.length > 0) {
  //     await this.telemetryEventRepository.bulkCreate(eventsToCreate);
  //     logger.info(`✅ ${eventsToCreate.length} novos eventos foram salvos no banco.`);
  //     this.triggerMasterDataSyncForMissing(newEvents);
  //   }
  // }

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
          logger.error('Não foi possível obter resposta da API MiX. Abortando ciclo atual.');
          hasMoreItems = false;
          continue;
        }

        // O _processEventsBatch agora só filtra e retorna os eventos a serem criados
        const eventsToCreate = this._processEventsBatch(response.events);

        // A lógica de salvar e atualizar o token agora é atômica
        await AppDataSource.transaction(async transactionalEntityManager => {
          if (eventsToCreate.length > 0) {
            await transactionalEntityManager
              .getRepository(TelemetryEvent)
              .save(eventsToCreate, { chunk: 200 });
            logger.info(`✅ ${eventsToCreate.length} novos eventos salvos no banco.`);

            this.triggerMasterDataSyncForMissing(eventsToCreate.map(e => e.raw_data as MixEvent));
          }

          // Atualizamos o token DENTRO da mesma transação
          const controlRepo = transactionalEntityManager.getRepository(EtlControl);
          await controlRepo.update(
            { process_name: PROCESS_NAME },
            { last_successful_sincetoken: response.nextSinceToken }
          );
        });

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
  private _processEventsBatch(events: MixEvent[]): DeepPartial<TelemetryEvent>[] {
    const uniqueEventsMap = new Map<string, MixEvent>();
    for (const event of events) {
      uniqueEventsMap.set(event.EventId, event);
    }
    const uniqueEvents = Array.from(uniqueEventsMap.values());

    if (events.length !== uniqueEvents.length) {
      logger.warn(
        `Lote de eventos continha duplicatas internas. Recebidos: ${events.length}, únicos: ${uniqueEvents.length}`
      );
    }

    // NOTA: A verificação contra o banco foi removida daqui.
    // A transação garante que, se o job for re-executado, ele tentará
    // inserir o mesmo lote e falhará na constraint de chave única,
    // causando um rollback e mantendo o estado consistente. O job falhará,
    // o que é o comportamento correto, evitando dados duplicados.
    // Para um sistema mais avançado, poderíamos manter a verificação, mas
    // a transação já nos dá a garantia de segurança principal.

    return uniqueEvents.map(event => ({
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
