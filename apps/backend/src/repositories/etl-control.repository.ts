import { AppDataSource } from '@/data-source.js';
import { EtlControl } from '@/entities/etl-control.entity.js';
import { BaseRepository } from './base.repository.js';

export class EtlControlRepository extends BaseRepository<EtlControl> {
  constructor() {
    const repo = AppDataSource.getRepository(EtlControl);
    super(repo);
  }

  /**
   * Busca um registro de controle pelo nome do processo.
   * @param processName O nome do processo (ex: 'event_ingestion').
   */
  async findByProcessName(processName: string): Promise<EtlControl | null> {
    return this.repository.findOne({ where: { process_name: processName } });
  }

  /**
   * Atualiza o sinceToken para um processo específico.
   * Cria o registro se ele não existir.
   */
  async updateToken(processName: string, token: string): Promise<void> {
    const control = await this.findByProcessName(processName);

    if (control) {
      await this.repository.update(control.id, { last_successful_sincetoken: token });
    } else {
      await this.repository.save({
        process_name: processName,
        last_successful_sincetoken: token,
      });
    }
  }
}
