import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('telemetry_events')
@Index('idx_telemetry_events_driver_external_id', ['driver_external_id'])
@Index('idx_telemetry_events_event_type_external_id', ['event_type_external_id'])
@Index('idx_telemetry_events_event_timestamp', ['event_timestamp'])
@Index('idx_telemetry_events_performance_report', ['driver_external_id', 'event_timestamp', 'event_type_external_id'])
export class TelemetryEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true, comment: 'ID do evento na API da MiX' })
  external_id!: bigint;

  @Column({ type: 'bigint', nullable: true, comment: 'ID externo do motorista na API MiX' })
  driver_external_id!: bigint | null;

  @Column({ type: 'bigint', nullable: true, comment: 'ID externo do veículo (asset) na API MiX' })
  vehicle_external_id!: bigint | null;

  @Column({ type: 'bigint', nullable: true, comment: 'ID externo do tipo de evento na API MiX' })
  event_type_external_id!: bigint | null;

  @Column({ type: 'timestamp', nullable: true })
  event_timestamp!: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  speed!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heading!: number | null;

  @Column({ type: 'text', nullable: true })
  location_description!: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Dados adicionais do evento' })
  additional_data!: object | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Payload original completo da API' })
  raw_data!: object | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
