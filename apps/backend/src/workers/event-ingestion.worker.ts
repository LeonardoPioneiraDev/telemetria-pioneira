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
import { ApiRateLimiter } from '@/services/api-rate-limiter.service.js';
import { EtlRecoveryService } from '@/services/etl-recovery.service.js';
import { EventsSinceResponse, MixApiClient, MixEvent } from '@/services/mix-api-client.service.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue } from 'bullmq';
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

  // Novos serviços de resiliência
  private rateLimiter: ApiRateLimiter;
  private recoveryService: EtlRecoveryService;
  private shouldStop: boolean = false;

  constructor(
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

    // Inicializa os novos serviços
    this.rateLimiter = new ApiRateLimiter();
    this.recoveryService = new EtlRecoveryService();
  }

  public stop(): void {
    this.shouldStop = true;
    logger.warn('⚠️ Parando worker após a iteração atual...');
  }

  async run(): Promise<void> {
    logger.info('🚀 Iniciando worker de ingestão de eventos...');

    const startTime = Date.now();
    let totalEventsProcessed = 0;
    let totalPagesProcessed = 0;
    let totalRetries = 0;

    try {
      const control = await this.etlControlRepository.findByProcessName(PROCESS_NAME);
      let currentToken = control?.last_successful_sincetoken || 'NEW';
      let hasMoreItems = true;

      logger.info(`📍 Iniciando busca de eventos com o token: ${currentToken}`);

      do {
        // ✅ VERIFICAÇÃO DE PARADA NO INÍCIO DO LOOP
        if (this.shouldStop) {
          logger.warn('🛑 Parando ETL conforme solicitado (SIGINT recebido)');
          break;
        }

        // ========== 1. CIRCUIT BREAKER CHECK ==========
        const canProceed = await this.recoveryService.checkCircuitBreaker();
        if (!canProceed) {
          logger.warn('⚠️ Circuit breaker impediu a continuação. Finalizando worker.');
          break;
        }

        // ========== 2. RATE LIMITER ==========
        await this.rateLimiter.waitBeforeNextRequest(hasMoreItems, false);

        // ✅ VERIFICAÇÃO APÓS ESPERA DO RATE LIMITER
        if (this.shouldStop) {
          logger.warn('🛑 Parando ETL durante rate limit');
          break;
        }

        // ========== 3. BUSCAR EVENTOS COM RETRY ==========
        let response: EventsSinceResponse | null = null;
        let attemptCount = 0;
        const maxAttempts = 3;

        while (attemptCount < maxAttempts && !response && !this.shouldStop) {
          try {
            logger.debug(
              `🔍 Buscando eventos (token: ${currentToken.substring(0, 20)}..., tentativa: ${attemptCount + 1}/${maxAttempts})`
            );

            response = await this.mixApiClient.getEventsSince(currentToken);

            if (response) {
              this.recoveryService.recordSuccess();
              this.rateLimiter.resetErrorCount();
              break;
            } else {
              throw new Error('API retornou resposta nula');
            }
          } catch (error) {
            attemptCount++;
            totalRetries++;

            logger.warn(
              `⚠️ Tentativa ${attemptCount}/${maxAttempts} falhou para token ${currentToken}`,
              {
                error: error instanceof Error ? error.message : String(error),
              }
            );

            if (attemptCount >= maxAttempts) {
              logger.error(
                `❌ Token ${currentToken} falhou após ${maxAttempts} tentativas. Avançando para o próximo token...`,
                {
                  error: error instanceof Error ? error.message : String(error),
                }
              );

              await this.recoveryService.recordFailedToken(currentToken, error);

              const nextToken = this.recoveryService.generateNextToken(currentToken);

              if (nextToken === currentToken) {
                logger.error(
                  '❌ Não foi possível avançar o token. Finalizando worker para evitar loop infinito.'
                );
                throw error;
              }

              await this.etlControlRepository.updateToken(PROCESS_NAME, nextToken);
              currentToken = nextToken;
              hasMoreItems = true;

              break;
            }

            // ✅ VERIFICAÇÃO ANTES DE AGUARDAR BACKOFF
            if (this.shouldStop) {
              logger.warn('🛑 Parando ETL durante retry');
              break;
            }

            await this.recoveryService.waitWithBackoff(attemptCount);
          }
        }

        // ✅ VERIFICAÇÃO APÓS TENTATIVAS DE RETRY
        if (this.shouldStop) {
          logger.warn('🛑 Parando ETL após tentativas de retry');
          break;
        }

        // ========== 4. SE NÃO CONSEGUIU RESPOSTA, PULA ESTA ITERAÇÃO ==========
        if (!response) {
          logger.warn('⚠️ Sem resposta válida após retries. Continuando para o próximo token...');
          continue;
        }

        // ========== 5. PROCESSAR EVENTOS ==========
        totalPagesProcessed++;

        logger.info(
          `📦 Página ${totalPagesProcessed}: ${response.events.length} eventos recebidos`,
          {
            hasMoreItems: response.hasMoreItems,
            nextToken: response.nextSinceToken.substring(0, 20) + '...',
          }
        );

        const newEventsToCreate = await this._processEventsBatch(response.events);

        // ✅ VERIFICAÇÃO ANTES DE SALVAR NO BANCO
        if (this.shouldStop) {
          logger.warn('🛑 Parando ETL antes de salvar eventos no banco');
          break;
        }

        // ========== 6. SALVAR NO BANCO (TRANSAÇÃO ATÔMICA) ==========
        await AppDataSource.transaction(async transactionalEntityManager => {
          if (newEventsToCreate.length > 0) {
            await transactionalEntityManager
              .getRepository(TelemetryEvent)
              .save(newEventsToCreate, { chunk: 200 });

            totalEventsProcessed += newEventsToCreate.length;

            logger.info(`✅ ${newEventsToCreate.length} novos eventos salvos no banco`, {
              totalProcessado: totalEventsProcessed,
            });

            // Dispara a sincronização apenas para os eventos que foram efetivamente criados
            this.triggerMasterDataSyncForMissing(
              newEventsToCreate.map(e => e.raw_data as MixEvent)
            );
          } else {
            logger.debug('ℹ️ Nenhum evento novo nesta página (todos já existiam no banco)');
          }

          // Atualiza o token DENTRO da mesma transação, garantindo consistência
          const controlRepo = transactionalEntityManager.getRepository(EtlControl);

          const existingControl = await controlRepo.findOne({
            where: { process_name: PROCESS_NAME },
          });

          if (existingControl) {
            await controlRepo.update(
              { process_name: PROCESS_NAME },
              { last_successful_sincetoken: response.nextSinceToken }
            );
          } else {
            await controlRepo.save({
              process_name: PROCESS_NAME,
              last_successful_sincetoken: response.nextSinceToken,
            });
          }
        });

        logger.debug(
          `💾 Token de controle atualizado no banco para: ${response.nextSinceToken.substring(0, 20)}...`
        );

        // ========== 7. ATUALIZAR VARIÁVEIS DE CONTROLE ==========
        currentToken = response.nextSinceToken;
        hasMoreItems = response.hasMoreItems;

        // Log de progresso
        if (totalPagesProcessed % 10 === 0) {
          logger.info(
            `📊 Progresso do ETL: ${totalPagesProcessed} páginas, ${totalEventsProcessed} eventos novos processados`
          );
        }

        // ✅ VERIFICAÇÃO NO FINAL DA ITERAÇÃO
        if (this.shouldStop) {
          logger.warn('🛑 Parando ETL no final da iteração');
          break;
        }
      } while (hasMoreItems && !this.shouldStop);

      // ========== 8. FINALIZAÇÃO COM SUCESSO ==========
      const duration = Date.now() - startTime;
      const stats = this.recoveryService.getStats();
      const rateLimiterStats = this.rateLimiter.getStats();

      if (this.shouldStop) {
        logger.warn('⚠️ Worker de ingestão interrompido pelo usuário (SIGINT)', {
          duration: `${Math.round(duration / 1000)}s`,
          totalPagesProcessed,
          totalEventsProcessed,
          totalRetries,
        });
      } else {
        logger.info('✅ Worker de ingestão de eventos concluiu com sucesso!', {
          duration: `${Math.round(duration / 1000)}s`,
          totalPagesProcessed,
          totalEventsProcessed,
          totalRetries,
          failedTokens: stats.failedTokensCount,
          consecutiveErrors: rateLimiterStats.consecutiveErrors,
        });
      }

      // Log detalhado de tokens falhados (se houver)
      if (stats.failedTokensCount > 0) {
        logger.warn('⚠️ Tokens que falharam durante o processamento:', {
          tokens: stats.failedTokensList.map(t => ({
            token: t.token.substring(0, 20) + '...',
            attempts: t.attempts,
            lastError: t.lastError.substring(0, 100),
          })),
        });
      }
    } catch (error) {
      logger.error('❌ Erro crítico durante a execução do worker de ingestão de eventos.', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      // Cleanup: desconecta o rate limiter
      await this.rateLimiter.disconnect();
    }
  }

  /**
   * Processa um lote de eventos, remove duplicatas e retorna apenas os novos
   * Este método é SÍNCRONO e puro (sem I/O interno além da verificação no banco)
   */
  private async _processEventsBatch(events: MixEvent[]): Promise<DeepPartial<TelemetryEvent>[]> {
    // 1. Remove duplicatas internas do lote
    const uniqueEventsMap = new Map<string, MixEvent>();
    for (const event of events) {
      uniqueEventsMap.set(event.EventId, event);
    }
    const uniqueEvents = Array.from(uniqueEventsMap.values());

    if (uniqueEvents.length === 0) return [];

    if (events.length !== uniqueEvents.length) {
      logger.debug(`🔍 Duplicatas internas removidas: ${events.length} → ${uniqueEvents.length}`);
    }

    // 2. Verifica contra o banco de dados
    const incomingExternalIds = uniqueEvents.map(event => BigInt(event.EventId));
    const existingExternalIds =
      await this.telemetryEventRepository.findExistingExternalIds(incomingExternalIds);
    const existingIdsSet = new Set(existingExternalIds.map(id => id.toString()));

    // 3. Filtra para obter apenas os eventos realmente novos
    const newEvents = uniqueEvents.filter(event => !existingIdsSet.has(event.EventId));

    logger.info(
      `🔍 Filtragem de duplicatas: ${events.length} recebidos → ${uniqueEvents.length} únicos → ${newEvents.length} novos`
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

      // 2. Buscar no banco quais desses IDs já existem
      const [existingVehicles, existingDrivers, existingEventTypes] = await Promise.all([
        this.vehicleRepository.findByExternalIds(vehicleIds),
        this.driverRepository.findByExternalIds(driverIds),
        this.eventTypeRepository.findByExternalIds(eventTypeIds),
      ]);

      const existingVehicleIds = new Set(existingVehicles.map(v => v.external_id.toString()));
      const existingDriverIds = new Set(existingDrivers.map(d => d.external_id.toString()));
      const existingEventTypeIds = new Set(existingEventTypes.map(e => e.external_id.toString()));

      // 3. Identificar se há algum ID faltando
      const hasMissingVehicles = vehicleIds.some(id => !existingVehicleIds.has(id.toString()));
      const hasMissingDrivers = driverIds.some(id => !existingDriverIds.has(id.toString()));
      const hasMissingEventTypes = eventTypeIds.some(
        id => !existingEventTypeIds.has(id.toString())
      );

      if (hasMissingVehicles || hasMissingDrivers || hasMissingEventTypes) {
        logger.info('🔗 IDs de dados mestres não encontrados. Disparando job de sincronização...', {
          missingVehicles: hasMissingVehicles,
          missingDrivers: hasMissingDrivers,
          missingEventTypes: hasMissingEventTypes,
        });

        // 4. Disparar um único job para o worker 'master-data-sync'
        // Usamos um ID de job fixo para evitar duplicatas em um curto espaço de tempo
        await this.masterDataQueue.add(
          'sync-all-master-data',
          {},
          {
            jobId: 'sync-on-demand',
            removeOnComplete: true,
            removeOnFail: true,
          }
        );
      }
    } catch (error) {
      logger.error('Falha ao disparar o job de sincronização de dados mestres.', error);
      // Não propaga o erro - sincronização de master data não deve impedir o ETL
    }
  }
}
