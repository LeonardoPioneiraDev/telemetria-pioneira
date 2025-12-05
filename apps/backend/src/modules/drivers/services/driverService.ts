//apps/backend/src/modules/drivers/services/driverService.ts
import { DriverRepository } from '@/repositories/driver.repository.js';
import { logger } from '@/shared/utils/logger.js';

export class DriverService {
  private driverRepository: DriverRepository;

  constructor() {
    this.driverRepository = new DriverRepository();
  }

  /**
   * Busca motoristas por nome ou crachá (employee_number).
   * @param searchTerm - O termo para buscar (nome ou crachá).
   * @returns Uma lista de motoristas.
   */
  public async search(searchTerm: string) {
    logger.info(`Buscando motoristas com o termo: ${searchTerm}`);

    if (searchTerm.length < 2) {
      logger.warn('Termo de busca muito curto, retornando lista vazia.');
      return [];
    }

    return this.driverRepository.searchByNameOrBadge(searchTerm);
  }
}
