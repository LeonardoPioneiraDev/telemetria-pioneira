import { AppDataSource } from '@/data-source.js';
import { Driver } from '@/entities/driver.entity.js';
import { DeepPartial, ILike } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class DriverRepository extends BaseRepository<Driver> {
  constructor() {
    const repo = AppDataSource.getRepository(Driver);
    super(repo);
  }

  // --- Métodos Específicos para Motoristas ---

  /**
   * Busca todos os IDs externos de motoristas existentes no banco.
   */
  async findAllExternalIds(): Promise<{ external_id: number }[]> {
    return this.repository.find({
      select: ['external_id'],
    });
  }

  /**
   * Atualiza um motorista existente com base em seu ID externo.
   */
  async updateByExternalId(externalId: number, data: DeepPartial<Driver>): Promise<void> {
    await this.repository.update({ external_id: externalId }, data);
  }

  /**
   * Cria um novo registro de motorista.
   */
  async create(data: DeepPartial<Driver>): Promise<Driver> {
    const driver = this.repository.create(data);
    return this.repository.save(driver);
  }

  /**
   * Realiza uma busca por nome de motorista (case-insensitive).
   */
  async searchByName(name: string): Promise<Driver[]> {
    return this.repository.find({
      where: {
        name: ILike(`%${name}%`),
      },
      take: 10,
    });
  }
}
