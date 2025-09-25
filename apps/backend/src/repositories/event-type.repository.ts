import { AppDataSource } from '@/data-source.js';
import { EventType } from '@/entities/event-type.entity.js';
import { DeepPartial } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class EventTypeRepository extends BaseRepository<EventType> {
  constructor() {
    const repo = AppDataSource.getRepository(EventType);
    super(repo);
  }

  // --- Métodos Específicos para Tipos de Evento ---

  /**
   * Busca todos os IDs externos de tipos de evento existentes no banco.
   */
  async findAllExternalIds(): Promise<{ external_id: number }[]> {
    return this.repository.find({
      select: ['external_id'],
    });
  }
  /**
   * Busca entidades por uma lista de IDs externos.
   * @param externalIds Array de IDs externos.
   */
  async findByExternalIds(externalIds: number[]): Promise<any[]> {
    if (externalIds.length === 0) {
      return [];
    }
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.external_id IN (:...externalIds)', { externalIds })
      .getMany();
  }

  /**
   * Atualiza um tipo de evento com base em seu ID externo.
   */
  async updateByExternalId(externalId: number, data: DeepPartial<EventType>): Promise<void> {
    await this.repository.update({ external_id: externalId }, data);
  }

  /**
   * Cria um novo registro de tipo de evento.
   */
  async create(data: DeepPartial<EventType>): Promise<EventType> {
    const eventType = this.repository.create(data);
    return this.repository.save(eventType);
  }

  async findAll(): Promise<EventType[]> {
    return this.repository.find();
  }

  async update(id: number, data: DeepPartial<EventType>): Promise<void> {
    await this.repository.update(id, data);
  }
}
