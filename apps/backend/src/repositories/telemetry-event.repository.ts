// apps/backend/src/repositories/telemetry-event.repository.ts
import { AppDataSource } from '@/data-source.js';
import { EventType } from '@/entities/event-type.entity.js';
import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { DeepPartial } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class TelemetryEventRepository extends BaseRepository<TelemetryEvent> {
  constructor() {
    const repo = AppDataSource.getRepository(TelemetryEvent);
    super(repo);
  }

  public getRepository() {
    return this.repository;
  }

  async bulkCreate(events: DeepPartial<TelemetryEvent>[]): Promise<void> {
    await this.repository.save(events, { chunk: 200 });
  }

  // async findExistingExternalIds(externalIds: bigint[]): Promise<bigint[]> {
  //   if (externalIds.length === 0) {
  //     return [];
  //   }

  //   const existingEvents = await this.repository.find({
  //     where: {
  //       external_id: In(externalIds),
  //     },
  //     select: ['external_id'],
  //   });

  //   return existingEvents.map(event => event.external_id);
  // }
  async findExistingExternalIds(externalIds: bigint[]): Promise<bigint[]> {
    if (externalIds.length === 0) {
      return [];
    }

    // ALTERAÇÃO: Trocamos o `repository.find` pelo `QueryBuilder`
    // para garantir a correta serialização do array de BigInts na cláusula IN.
    const results = await this.repository
      .createQueryBuilder('event')
      .select('event.external_id', 'external_id')
      .where('event.external_id IN (:...externalIds)', { externalIds })
      .getRawMany();

    // O getRawMany retorna objetos com a propriedade como string,
    // então convertemos de volta para BigInt para manter a consistência do tipo.
    return results.map(row => BigInt(row.external_id));
  }
  /**
   * Busca eventos de um motorista que correspondam a certas classificações.
   *
   */
  public async findByDriverAndClassifications(
    driverExternalId: bigint,
    classifications: string[]
  ): Promise<any[]> {
    if (classifications.length === 0) {
      return [];
    }

    // Usamos o QueryBuilder para ter controle total sobre a consulta
    const query = this.repository
      .createQueryBuilder('event')
      .leftJoin(EventType, 'eventType', 'eventType.external_id = event.event_type_external_id')
      .select([
        // Seleciona explicitamente os campos necessários para o serviço
        'event.external_id AS "external_id"',
        'event.event_timestamp AS "occurred_at"',
        'event.speed AS "speed_kmh"',
        'event.raw_data AS "raw_data"',
        'eventType.description AS "eventType_description"',
      ])
      .where('event.driver_external_id = :driverExternalId', { driverExternalId })
      .andWhere('eventType.classification IN (:...classifications)', { classifications })
      .orderBy('event.event_timestamp', 'DESC');

    return query.getRawMany();
  }
}
