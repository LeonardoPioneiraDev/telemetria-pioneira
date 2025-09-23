import { AppDataSource } from '@/data-source.js';
import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { DeepPartial } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class TelemetryEventRepository extends BaseRepository<TelemetryEvent> {
  constructor() {
    const repo = AppDataSource.getRepository(TelemetryEvent);
    super(repo);
  }

  /**
   * Insere múltiplos eventos de uma vez para melhor performance.
   * @param events Um array de objetos de evento para criar.
   */
  async bulkCreate(events: DeepPartial<TelemetryEvent>[]): Promise<void> {
    // O 'chunk' é importante para não sobrecarregar o banco com inserções gigantes
    // Inserimos em lotes de 200 eventos por vez.
    await this.repository.save(events, { chunk: 200 });
  }
}
