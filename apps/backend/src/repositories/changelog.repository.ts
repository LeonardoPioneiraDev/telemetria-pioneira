import { AppDataSource } from '@/data-source.js';
import { ChangelogEntry } from '@/entities/changelog-entry.entity.js';
import { UserChangelogView } from '@/entities/user-changelog-view.entity.js';
import { Repository } from 'typeorm';

export class ChangelogRepository {
  private entryRepository: Repository<ChangelogEntry>;
  private viewRepository: Repository<UserChangelogView>;

  constructor() {
    this.entryRepository = AppDataSource.getRepository(ChangelogEntry);
    this.viewRepository = AppDataSource.getRepository(UserChangelogView);
  }

  /**
   * Lista todas as entradas do changelog ordenadas por data de publicação
   */
  async findAll(): Promise<ChangelogEntry[]> {
    return this.entryRepository.find({
      order: { published_at: 'DESC' },
    });
  }

  /**
   * Busca entradas não lidas por um usuário específico
   */
  async findUnreadByUserId(userId: string): Promise<ChangelogEntry[]> {
    const viewedEntryIds = await this.viewRepository
      .createQueryBuilder('view')
      .select('view.changelog_entry_id')
      .where('view.user_id = :userId', { userId })
      .getRawMany();

    const viewedIds = viewedEntryIds.map(v => v.changelog_entry_id);

    if (viewedIds.length === 0) {
      return this.findAll();
    }

    return this.entryRepository
      .createQueryBuilder('entry')
      .where('entry.id NOT IN (:...viewedIds)', { viewedIds })
      .orderBy('entry.published_at', 'DESC')
      .getMany();
  }

  /**
   * Conta entradas não lidas por um usuário
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    const totalEntries = await this.entryRepository.count();
    const viewedCount = await this.viewRepository.count({
      where: { userId },
    });
    return Math.max(0, totalEntries - viewedCount);
  }

  /**
   * Verifica se há entradas não lidas
   */
  async hasUnreadByUserId(userId: string): Promise<boolean> {
    const count = await this.countUnreadByUserId(userId);
    return count > 0;
  }

  /**
   * Marca uma entrada como lida por um usuário
   */
  async markAsRead(userId: string, entryId: number): Promise<void> {
    const existing = await this.viewRepository.findOne({
      where: { userId, changelogEntryId: entryId },
    });

    if (!existing) {
      await this.viewRepository.save({
        userId,
        changelogEntryId: entryId,
      });
    }
  }

  /**
   * Marca todas as entradas como lidas por um usuário
   */
  async markAllAsRead(userId: string): Promise<void> {
    const allEntries = await this.entryRepository.find({ select: ['id'] });
    const viewedEntries = await this.viewRepository.find({
      where: { userId },
      select: ['changelogEntryId'],
    });

    const viewedIds = new Set(viewedEntries.map(v => v.changelogEntryId));
    const unreadEntries = allEntries.filter(e => !viewedIds.has(e.id));

    if (unreadEntries.length > 0) {
      const views = unreadEntries.map(entry => ({
        userId,
        changelogEntryId: entry.id,
      }));
      await this.viewRepository.save(views);
    }
  }

  /**
   * Lista todas as entradas com status de leitura para um usuário
   */
  async findAllWithReadStatus(userId: string): Promise<(ChangelogEntry & { isRead: boolean })[]> {
    const entries = await this.findAll();
    const viewedEntries = await this.viewRepository.find({
      where: { userId },
      select: ['changelogEntryId'],
    });

    const viewedIds = new Set(viewedEntries.map(v => v.changelogEntryId));

    return entries.map(entry => ({
      ...entry,
      isRead: viewedIds.has(entry.id),
    }));
  }
}
