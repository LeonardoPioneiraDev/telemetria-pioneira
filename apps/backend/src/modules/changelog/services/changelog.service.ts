import { ChangelogEntry } from '@/entities/changelog-entry.entity.js';
import { ChangelogRepository } from '@/repositories/changelog.repository.js';
import { logger } from '@/shared/utils/logger.js';

export interface ChangelogEntryWithReadStatus extends ChangelogEntry {
  isRead: boolean;
}

export interface UnreadResponse {
  hasUnread: boolean;
  count: number;
  entries: ChangelogEntry[];
}

export interface HasUnreadResponse {
  hasUnread: boolean;
  count: number;
}

export class ChangelogService {
  private repository: ChangelogRepository;

  constructor() {
    this.repository = new ChangelogRepository();
  }

  /**
   * Lista todas as entradas do changelog com status de leitura
   */
  async getAll(userId: string): Promise<ChangelogEntryWithReadStatus[]> {
    logger.debug(`Buscando changelog para usuário ${userId}`);
    return this.repository.findAllWithReadStatus(userId);
  }

  /**
   * Busca entradas não lidas pelo usuário
   */
  async getUnread(userId: string): Promise<UnreadResponse> {
    logger.debug(`Buscando entradas não lidas para usuário ${userId}`);

    const entries = await this.repository.findUnreadByUserId(userId);
    const count = entries.length;

    return {
      hasUnread: count > 0,
      count,
      entries,
    };
  }

  /**
   * Verifica rapidamente se há entradas não lidas
   */
  async hasUnread(userId: string): Promise<HasUnreadResponse> {
    const count = await this.repository.countUnreadByUserId(userId);
    return {
      hasUnread: count > 0,
      count,
    };
  }

  /**
   * Marca todas as entradas como lidas
   */
  async markAllAsRead(userId: string): Promise<void> {
    logger.info(`Marcando todas entradas como lidas para usuário ${userId}`);
    await this.repository.markAllAsRead(userId);
  }
}
