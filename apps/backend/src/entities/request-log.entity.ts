import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('request_logs')
@Index('idx_request_logs_timestamp', ['timestamp'])
@Index('idx_request_logs_user_id', ['userId'])
@Index('idx_request_logs_status_code', ['statusCode'])
export class RequestLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'varchar', length: 10 })
  method!: string;

  @Column({ type: 'varchar', length: 500 })
  endpoint!: string;

  @Column({ name: 'route_pattern', type: 'varchar', length: 500, nullable: true })
  routePattern!: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole!: string | null;

  @Column({ name: 'status_code', type: 'smallint' })
  statusCode!: number;

  @Column({ name: 'latency_ms', type: 'integer' })
  latencyMs!: number;

  @Column({ name: 'response_size_bytes', type: 'integer', nullable: true })
  responseSizeBytes!: number | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
