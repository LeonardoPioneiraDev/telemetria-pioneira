import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ActivityType = 'login' | 'logout' | 'password_reset' | 'password_change';

@Entity('user_activity_logs')
@Index('idx_user_activity_timestamp', ['timestamp'])
@Index('idx_user_activity_user_id', ['userId'])
@Index('idx_user_activity_type', ['activityType'])
export class UserActivityLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'activity_type', type: 'varchar', length: 50 })
  activityType!: ActivityType;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp!: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
