import { AppDataSource } from '@/data-source.js';
import { ApiCredential } from '@/entities/api-credential.entity.js';
import { logger } from '@/shared/utils/logger.js';
import { DeepPartial } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class ApiCredentialRepository extends BaseRepository<ApiCredential> {
  constructor() {
    const repo = AppDataSource.getRepository(ApiCredential);
    super(repo);
  }

  /**
   * Busca a primeira (e única) credencial da tabela.
   * @returns A entidade ApiCredential ou nulo se não existir.
   */
  async findFirst(): Promise<ApiCredential | null> {
    const credentials = await this.repository.find({ take: 1 });
    return credentials[0] || null;
  }

  /**
   * Cria ou atualiza as credenciais da API no banco de dados.
   * Garante que sempre haverá apenas um registro na tabela.
   * @param data Os dados da credencial a serem salvos.
   * @returns A entidade ApiCredential salva.
   */
  async upsertCredentials(data: DeepPartial<ApiCredential>): Promise<ApiCredential> {
    const existingCredentials = await this.findFirst();

    if (existingCredentials) {
      // Se já existe, atualiza o registro existente
      logger.debug('Atualizando credenciais da API existentes...');
      const updated = this.repository.merge(existingCredentials, data);
      return this.repository.save(updated);
    } else {
      // Se não existe, cria um novo registro
      logger.debug('Criando novo registro de credenciais da API...');
      const newCredentials = this.repository.create(data);
      return this.repository.save(newCredentials);
    }
  }
}
