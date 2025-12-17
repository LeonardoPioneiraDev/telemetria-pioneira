import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_page_views')
@Index('idx_page_views_user_id', ['userId'])
@Index('idx_page_views_viewed_at', ['viewedAt'])
@Index('idx_page_views_page_path', ['pagePath'])
@Index('idx_page_views_user_activity', ['userId', 'viewedAt'])
export class UserPageView {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'page_path', type: 'varchar', length: 500 })
  pagePath!: string;

  @Column({ name: 'page_title', type: 'varchar', length: 255, nullable: true })
  pageTitle!: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
  sessionId!: string | null;

  @Column({ name: 'viewed_at', type: 'timestamptz', default: () => 'NOW()' })
  viewedAt!: Date;

  @Column({ name: 'time_on_page_ms', type: 'integer', nullable: true })
  timeOnPageMs!: number | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'referrer_path', type: 'varchar', length: 500, nullable: true })
  referrerPath!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
