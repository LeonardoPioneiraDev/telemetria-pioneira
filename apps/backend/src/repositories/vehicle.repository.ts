import { AppDataSource } from '@/data-source.js';
import { Vehicle } from '@/entities/vehicle.entity.js';
import { DeepPartial } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class VehicleRepository extends BaseRepository<Vehicle> {
  constructor() {
    const repo = AppDataSource.getRepository(Vehicle);
    super(repo);
  }

  // --- Métodos Específicos para Veículos ---

  /**
   * Busca todos os IDs externos de veículos existentes no banco.
   * Otimizado para retornar apenas a coluna necessária.
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
  async findByExternalIds(externalIds: bigint[]): Promise<Vehicle[]> {
    if (externalIds.length === 0) {
      return [];
    }
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.external_id IN (:...externalIds)', { externalIds })
      .getMany();
  }

  /**
   * Atualiza um veículo existente com base em seu ID externo.
   * @param externalId O ID externo do veículo.
   * @param data Os novos dados a serem atualizados.
   */
  async updateByExternalId(externalId: bigint, data: DeepPartial<Vehicle>): Promise<void> {
    // ALTERADO
    await this.repository.update({ external_id: externalId }, data);
  }

  /**
   * Cria um novo registro de veículo.
   * @param data Os dados do novo veículo.
   */
  async create(data: DeepPartial<Vehicle>): Promise<Vehicle> {
    const vehicle = this.repository.create(data);
    return this.repository.save(vehicle);
  }
}
