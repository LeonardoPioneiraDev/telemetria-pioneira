// apps/backend/src/repositories/telemetry-event.repository.ts
import { AppDataSource } from '@/data-source.js';
import { EventType } from '@/entities/event-type.entity.js';
import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { DeepPartial, In } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class TelemetryEventRepository extends BaseRepository<TelemetryEvent> {
  constructor() {
    const repo = AppDataSource.getRepository(TelemetryEvent);
    super(repo);
  }

  async bulkCreate(events: DeepPartial<TelemetryEvent>[]): Promise<void> {
    await this.repository.save(events, { chunk: 200 });
  }

  async findExistingExternalIds(externalIds: string[]): Promise<string[]> {
    if (externalIds.length === 0) {
      return [];
    }

    const existingEvents = await this.repository.find({
      where: {
        external_id: In(externalIds),
      },
      select: ['external_id'],
    });

    return existingEvents.map(event => event.external_id);
  }

  // ✅ SIMPLES E DIRETO - SEM COMPLICAÇÃO
  public async findByDriverAndClassifications(
    driverExternalId: string,
    classifications: string[]
  ): Promise<any[]> {
    // 1. Buscar todos os eventos do motorista
    const events = await this.repository.find({
      where: {
        driver_external_id: driverExternalId,
      },
      order: {
        occurred_at: 'DESC',
      },
    });

    if (events.length === 0) {
      return [];
    }

    // 2. Buscar os tipos de evento que são infrações
    const eventTypeRepo = AppDataSource.getRepository(EventType);
    const infractionTypes = await eventTypeRepo.find({
      where: {
        classification: In(classifications),
      },
    });

    // 3. Criar mapa de tipos de infração
    const infractionTypeIds = new Set(infractionTypes.map(et => et.external_id.toString()));

    // 4. Filtrar apenas eventos que são infrações e adicionar descrição
    const infractionTypeMap = new Map(infractionTypes.map(et => [et.external_id.toString(), et]));

    return events
      .filter(event => infractionTypeIds.has(event.event_type_external_id))
      .map(event => ({
        ...event,
        eventType_description:
          infractionTypeMap.get(event.event_type_external_id)?.description ||
          'Descrição indisponível',
      }));
  }
}
