import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { EtlControlRepository } from '@/repositories/etl-control.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient, MixEvent } from '@/services/mix-api-client.service.js';
import { logger } from '@/shared/utils/logger.js';
import { DeepPartial } from 'typeorm';

const PROCESS_NAME = 'event_ingestion';

export class EventIngestionWorker {
  private mixApiClient: MixApiClient;
  private etlControlRepository: EtlControlRepository;
  private telemetryEventRepository: TelemetryEventRepository;
  private driverRepository: DriverRepository;
  private vehicleRepository: VehicleRepository;
  private eventTypeRepository: EventTypeRepository;

  constructor(
    // Injeção de dependência para mantermos o código testável
    mixApiClient: MixApiClient,
    etlControlRepository: EtlControlRepository,
    telemetryEventRepository: TelemetryEventRepository,
    driverRepository: DriverRepository,
    vehicleRepository: VehicleRepository,
    eventTypeRepository: EventTypeRepository
  ) {
    this.mixApiClient = mixApiClient;
    this.etlControlRepository = etlControlRepository;
    this.telemetryEventRepository = telemetryEventRepository;
    this.driverRepository = driverRepository;
    this.vehicleRepository = vehicleRepository;
    this.eventTypeRepository = eventTypeRepository;
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

        // A CORREÇÃO ESTÁ AQUI: Sempre atualizamos o token, mesmo que não venham eventos.
        if (response) {
          currentToken = response.nextSinceToken; // Atualiza o token para o próximo loop ou para salvar no final
          hasMoreItems = response.hasMoreItems;
        } else {
          hasMoreItems = false; // Se a resposta for nula, paramos o loop
        }

        if (!response || response.events.length === 0) {
          logger.info('Nenhum evento novo encontrado nesta iteração.');
        } else {
          logger.info(`Recebidos ${response.events.length} eventos. Processando...`);
          await this._processEventsBatch(response.events);
          logger.debug(`Próximo token: ${currentToken} | Mais itens: ${hasMoreItems}`);
        }
      } while (hasMoreItems);

      // Salva o último token recebido para a próxima execução do worker
      await this.etlControlRepository.updateToken(PROCESS_NAME, currentToken);

      logger.info('✅ Worker de ingestão de eventos concluído com sucesso.');
    } catch (error) {
      logger.error('❌ Erro durante a execução do worker de ingestão de eventos.', error);
      throw error;
    }
  }

  /**
   * Processa um lote de eventos recebidos da API.
   */
  private async _processEventsBatch(events: MixEvent[]): Promise<void> {
    // Mapeamento de IDs externos para internos para evitar múltiplas queries (N+1 problem)
    const { driverMap, vehicleMap, eventTypeMap } = await this._mapExternalToInternalIds(events);

    const eventsToCreate: DeepPartial<TelemetryEvent>[] = [];

    for (const event of events) {
      const driverId = driverMap.get(String(event.DriverId));
      const vehicleId = vehicleMap.get(String(event.AssetId));
      const eventTypeId = eventTypeMap.get(String(event.EventTypeId));

      // Se não encontrarmos o motorista/veículo/tipo no nosso banco, pulamos este evento por enquanto.
      // A sincronização de apoio (híbrida ou diária) irá resolver isso depois.
      if (!driverId || !vehicleId || !eventTypeId) {
        logger.warn(
          `Pulando evento ${event.EventId} por não encontrar ID de apoio correspondente.`
        );
        continue;
      }

      eventsToCreate.push({
        external_id: event.EventId,
        occurred_at: event.StartDateTime,
        latitude: event.StartPosition?.Latitude,
        longitude: event.StartPosition?.Longitude,
        speed_kmh: event.StartPosition?.SpeedKilometresPerHour,
        speed_limit_kmh: event.StartPosition?.SpeedLimit,
        odometer_km: event.StartOdometerKilometres,
        value: event.Value,
        raw_data: event,
        driver: { id: driverId },
        vehicle: { id: vehicleId },
        eventType: { id: eventTypeId },
      });
    }

    if (eventsToCreate.length > 0) {
      await this.telemetryEventRepository.bulkCreate(eventsToCreate);
      logger.info(`${eventsToCreate.length} eventos transformados e salvos no banco.`);
    }
  }

  /**
   * Otimização: Busca todos os IDs internos de uma só vez para um lote de eventos.
   */
  private async _mapExternalToInternalIds(events: MixEvent[]) {
    const driverExternalIds = [...new Set(events.map(e => e.DriverId))];
    const vehicleExternalIds = [...new Set(events.map(e => e.AssetId))];
    const eventTypeExternalIds = [...new Set(events.map(e => e.EventTypeId))];

    const [drivers, vehicles, eventTypes] = await Promise.all([
      this.driverRepository.findByExternalIds(driverExternalIds),
      this.vehicleRepository.findByExternalIds(vehicleExternalIds),
      this.eventTypeRepository.findByExternalIds(eventTypeExternalIds),
    ]);

    const driverMap = new Map(drivers.map(d => [String(d.external_id), d.id]));
    const vehicleMap = new Map(vehicles.map(v => [String(v.external_id), v.id]));
    const eventTypeMap = new Map(eventTypes.map(e => [String(e.external_id), e.id]));

    return { driverMap, vehicleMap, eventTypeMap };
  }
}
