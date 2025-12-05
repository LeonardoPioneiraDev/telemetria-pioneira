import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ChangelogEntry } from './changelog-entry.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('user_changelog_views')
@Index('idx_user_changelog_views_user_id', ['userId'])
@Index('idx_user_changelog_views_unique', ['userId', 'changelogEntryId'], { unique: true })
export class UserChangelogView {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('ChangelogEntry', 'views', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'changelog_entry_id' })
  changelogEntry!: ChangelogEntry;

  @Column({ name: 'changelog_entry_id', type: 'int' })
  changelogEntryId!: number;

  @Column({ type: 'timestamp with time zone', default: () => 'NOW()' })
  viewed_at!: Date;
}
