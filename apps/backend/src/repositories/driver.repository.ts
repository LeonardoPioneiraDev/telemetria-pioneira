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
  async findAllExternalIds(): Promise<{ external_id: bigint }[]> {
    return this.repository.find({
      select: ['external_id'],
    }) as any;
  }

  public async findById(id: number): Promise<Driver | null> {
    return this.repository.findOneBy({ id });
  }

  /**
   * Atualiza um motorista existente com base em seu ID externo.
   */
  async updateByExternalId(externalId: bigint, data: DeepPartial<Driver>): Promise<void> {
    // ALTERADO
    await this.repository.update({ external_id: externalId }, data);
  }
  /**
   * Busca entidades por uma lista de IDs externos.
   * @param externalIds Array de IDs externos.
   */
  async findByExternalIds(externalIds: bigint[]): Promise<Driver[]> {
    if (externalIds.length === 0) {
      return [];
    }
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.external_id IN (:...externalIds)', { externalIds })
      .getMany();
  }

  /**
   * Cria um novo registro de motorista.
   */
  async create(data: DeepPartial<Driver>): Promise<Driver> {
    const driver = this.repository.create(data);
    return this.repository.save(driver);
  }

  /**
   * Realiza uma busca por nome ou crachá (employee_number) - case-insensitive.
   */
  async searchByNameOrBadge(searchTerm: string): Promise<Driver[]> {
    return this.repository.find({
      where: [
        { name: ILike(`%${searchTerm}%`) },
        { employee_number: ILike(`%${searchTerm}%`) },
      ],
      take: 10,
      order: { name: 'ASC' },
    });
  }
}
