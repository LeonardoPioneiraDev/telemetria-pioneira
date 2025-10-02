import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type HistoricalLoadStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

@Entity('historical_load_control')
export class HistoricalLoadControl {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  job_id!: string;

  @Column({ type: 'timestamp' })
  start_date!: Date;

  @Column({ type: 'timestamp' })
  end_date!: Date;

  @Column({ type: 'varchar', default: 'pending' })
  status!: HistoricalLoadStatus;

  @Column({ type: 'timestamp', nullable: true })
  current_checkpoint!: Date | null;

  @Column({ type: 'int' })
  total_hours!: number;

  @Column({ type: 'int', default: 0 })
  hours_processed!: number;

  @Column({ type: 'int', default: 0 })
  events_processed!: number;

  @Column({ type: 'timestamp', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
