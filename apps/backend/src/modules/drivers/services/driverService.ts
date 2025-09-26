//apps/backend/src/modules/drivers/services/driverService.ts
import { DriverRepository } from '@/repositories/driver.repository.js';
import { logger } from '@/shared/utils/logger.js';

export class DriverService {
  private driverRepository: DriverRepository;

  constructor() {
    this.driverRepository = new DriverRepository();
  }

  /**
   * Busca motoristas por um termo de pesquisa.
   * @param name - O termo para buscar no nome dos motoristas.
   * @returns Uma lista de motoristas.
   */
  public async searchByName(name: string) {
    logger.info(`Buscando motoristas com o termo: ${name}`);

    if (name.length < 3) {
      logger.warn('Termo de busca muito curto, retornando lista vazia.');
      return []; // Evita buscas muito amplas no banco
    }

    return this.driverRepository.searchByName(name);
  }
}
