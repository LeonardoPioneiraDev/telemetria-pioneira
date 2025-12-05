import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { UserChangelogView } from './user-changelog-view.entity.js';

export type ChangelogEntryType = 'feature' | 'improvement' | 'fix';

@Entity('changelog_entries')
@Index('idx_changelog_entries_published_at', ['published_at'])
export class ChangelogEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  version!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 20, default: 'feature' })
  type!: ChangelogEntryType;

  @Column({ type: 'timestamp with time zone', default: () => 'NOW()' })
  published_at!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @OneToMany('UserChangelogView', 'changelogEntry')
  views!: UserChangelogView[];
}
