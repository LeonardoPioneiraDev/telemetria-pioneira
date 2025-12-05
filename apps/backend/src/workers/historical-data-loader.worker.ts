BigInt.prototype.toJSON = function () {
  return this.toString();
};

import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { HistoricalLoadControlRepository } from '@/repositories/historical-load-control.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient, MixEvent } from '@/services/mix-api-client.service.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue } from 'bullmq';
import { DeepPartial } from 'typeorm';

export interface HistoricalLoadJobData {
  jobId: string;
  startDate: Date;
  endDate: Date;
}

export class HistoricalDataLoaderWorker {
  private mixApiClient: MixApiClient;
  private historicalLoadRepo: HistoricalLoadControlRepository;
  private telemetryEventRepo: TelemetryEventRepository;
  private driverRepo: DriverRepository;
  private vehicleRepo: VehicleRepository;
  private eventTypeRepo: EventTypeRepository;
  private masterDataQueue: Queue;

  private shouldStop: boolean = false;

  constructor(
    mixApiClient: MixApiClient,
    historicalLoadRepo: HistoricalLoadControlRepository,
    telemetryEventRepo: TelemetryEventRepository,
    driverRepo: DriverRepository,
    vehicleRepo: VehicleRepository,
    eventTypeRepo: EventTypeRepository,
    masterDataQueue: Queue
  ) {
    this.mixApiClient = mixApiClient;
    this.historicalLoadRepo = historicalLoadRepo;
    this.telemetryEventRepo = telemetryEventRepo;
    this.driverRepo = driverRepo;
    this.vehicleRepo = vehicleRepo;
    this.eventTypeRepo = eventTypeRepo;
    this.masterDataQueue = masterDataQueue;
  }

  public stop(): void {
    this.shouldStop = true;
    logger.warn('⚠️ Parando worker de carga histórica após a hora atual...');
  }

  async run(jobData: HistoricalLoadJobData): Promise<void> {
    const startDate = new Date(jobData.startDate);
    const endDate = new Date(jobData.endDate);
    const { jobId } = jobData;

    logger.info('🚀 Iniciando carga histórica de eventos', {
      jobId,
      startDate: startDate.toISOString(), // Agora funciona
      endDate: endDate.toISOString(),
    });

    try {
      await this.historicalLoadRepo.updateStatus(jobId, 'running');

      // Calcula total de horas
      const totalHours = this._calculateHours(startDate, endDate);
      let hoursProcessed = 0;
      let totalEventsProcessed = 0;

      logger.info(`📊 Total de horas a processar: ${totalHours}`);

      // Itera hora por hora
      let currentDate = new Date(startDate);

      while (currentDate < endDate && !this.shouldStop) {
        const nextHour = new Date(currentDate);
        nextHour.setHours(nextHour.getHours() + 1);

        // Se nextHour ultrapassar endDate, ajusta para endDate
        const toDate = nextHour > endDate ? endDate : nextHour;

        // Formata datas no formato yyyyMMddhhmmss
        const fromStr = this._formatDateForApi(currentDate);
        const toStr = this._formatDateForApi(toDate);

        logger.info(`⏳ Processando hora: ${fromStr} → ${toStr}`);

        try {
          // Busca eventos da API
          const events = await this.mixApiClient.getHistoricalEvents(fromStr, toStr);

          if (events === null) {
            logger.warn(
              `⚠️ Falha ao buscar eventos para o intervalo ${fromStr} → ${toStr}. Continuando...`
            );
            // Continua para a próxima hora mesmo com falha
            currentDate = nextHour;
            hoursProcessed++;
            continue;
          }

          // Mapeia eventos para entidades (duplicatas internas removidas)
          const eventsToInsert = this._mapEventsToEntities(events);

          // Salva no banco usando INSERT ON CONFLICT DO NOTHING
          if (eventsToInsert.length > 0) {
            const insertedCount = await this.telemetryEventRepo.bulkInsertIgnoreDuplicates(eventsToInsert);

            if (insertedCount > 0) {
              totalEventsProcessed += insertedCount;
              logger.info(`✅ ${insertedCount}/${eventsToInsert.length} eventos inseridos (total: ${totalEventsProcessed})`);

              // Dispara sync de master data apenas a cada 10 horas
              if (hoursProcessed % 10 === 0) {
                this._triggerMasterDataSyncIfNeeded(events);
              }
            }
          }

          // Atualiza progresso
          hoursProcessed++;
          await this.historicalLoadRepo.updateProgress(
            jobId,
            toDate,
            hoursProcessed,
            totalEventsProcessed
          );

          // Log de progresso a cada 10 horas
          if (hoursProcessed % 10 === 0) {
            const percentage = ((hoursProcessed / totalHours) * 100).toFixed(1);
            logger.info(`📈 Progresso: ${hoursProcessed}/${totalHours} horas (${percentage}%)`);
          }

          // Aguarda 3 segundos (20 req/min = rate limit)
          await this._sleep(3000);
        } catch (error) {
          logger.error(`❌ Erro ao processar hora ${fromStr}:`, error);
          // Continua para próxima hora
        }

        currentDate = nextHour;

        // Verifica se deve parar
        if (this.shouldStop) {
          logger.warn('🛑 Carga histórica interrompida pelo usuário');
          await this.historicalLoadRepo.updateStatus(jobId, 'cancelled');
          return;
        }
      }

      // Finalizado com sucesso
      await this.historicalLoadRepo.updateStatus(jobId, 'completed');

      const duration = Date.now() - new Date(startDate).getTime();
      logger.info('✅ Carga histórica concluída com sucesso!', {
        jobId,
        totalHours,
        hoursProcessed,
        totalEventsProcessed,
        duration: `${Math.round(duration / 1000 / 60)}min`,
      });
    } catch (error) {
      logger.error('❌ Erro crítico na carga histórica:', error);
      await this.historicalLoadRepo.updateStatus(
        jobId,
        'failed',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private _calculateHours(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }

  private _formatDateForApi(date: Date): string {
    // ✅ CORREÇÃO: Usar métodos UTC para garantir timezone correto
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Mapeia eventos para entidades, removendo apenas duplicatas internas.
   * A verificação contra o banco é feita via INSERT ON CONFLICT DO NOTHING.
   */
  private _mapEventsToEntities(events: MixEvent[]): DeepPartial<TelemetryEvent>[] {
    // Remove duplicatas internas
    const uniqueEventsMap = new Map<string, MixEvent>();
    for (const event of events) {
      uniqueEventsMap.set(event.EventId, event);
    }
    const uniqueEvents = Array.from(uniqueEventsMap.values());

    if (uniqueEvents.length === 0) return [];

    if (events.length !== uniqueEvents.length) {
      logger.debug(`🔍 Duplicatas internas removidas: ${events.length} → ${uniqueEvents.length}`);
    }

    // Mapeia para entidade
    return uniqueEvents.map(event => ({
      external_id: BigInt(event.EventId),
      event_timestamp: event.StartDateTime,
      latitude: event.StartPosition?.Latitude ?? null,
      longitude: event.StartPosition?.Longitude ?? null,
      speed: event.StartPosition?.SpeedKilometresPerHour ?? null,
      location_description: event.StartPosition?.FormattedAddress ?? null,
      raw_data: event,
      driver_external_id: event.DriverId ? BigInt(event.DriverId) : null,
      vehicle_external_id: event.AssetId ? BigInt(event.AssetId) : null,
      event_type_external_id: event.EventTypeId ? BigInt(event.EventTypeId) : null,
    }));
  }

  private async _triggerMasterDataSyncIfNeeded(newEvents: MixEvent[]): Promise<void> {
    try {
      const vehicleIds = [
        ...new Set(
          newEvents
            .map(e => e.AssetId)
            .filter(Boolean)
            .map(id => BigInt(id!))
        ),
      ];
      const driverIds = [
        ...new Set(
          newEvents
            .map(e => e.DriverId)
            .filter(Boolean)
            .map(id => BigInt(id!))
        ),
      ];
      const eventTypeIds = [
        ...new Set(
          newEvents
            .map(e => e.EventTypeId)
            .filter(Boolean)
            .map(id => BigInt(id!))
        ),
      ];

      const [existingVehicles, existingDrivers, existingEventTypes] = await Promise.all([
        this.vehicleRepo.findByExternalIds(vehicleIds),
        this.driverRepo.findByExternalIds(driverIds),
        this.eventTypeRepo.findByExternalIds(eventTypeIds),
      ]);

      const existingVehicleIds = new Set(existingVehicles.map(v => v.external_id.toString()));
      const existingDriverIds = new Set(existingDrivers.map(d => d.external_id.toString()));
      const existingEventTypeIds = new Set(existingEventTypes.map(e => e.external_id.toString()));

      const hasMissingVehicles = vehicleIds.some(id => !existingVehicleIds.has(id.toString()));
      const hasMissingDrivers = driverIds.some(id => !existingDriverIds.has(id.toString()));
      const hasMissingEventTypes = eventTypeIds.some(
        id => !existingEventTypeIds.has(id.toString())
      );

      if (hasMissingVehicles || hasMissingDrivers || hasMissingEventTypes) {
        await this.masterDataQueue.add(
          'sync-all-master-data',
          {},
          {
            jobId: 'sync-on-demand-historical',
            removeOnComplete: true,
            removeOnFail: true,
          }
        );
      }
    } catch (error) {
      logger.error('Falha ao disparar sync de master data:', error);
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
