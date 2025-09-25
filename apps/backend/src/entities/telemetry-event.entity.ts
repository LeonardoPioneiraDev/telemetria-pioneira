// src/entities/telemetry-event.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('telemetry_events')
export class TelemetryEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true })
  external_id!: string;

  @Column({ type: 'bigint' })
  driver_external_id!: string;

  @Column({ type: 'bigint' })
  vehicle_external_id!: string;

  @Column({ type: 'bigint' })
  event_type_external_id!: string;

  @Column({ type: 'timestamptz' })
  occurred_at!: Date;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  speed_kmh!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  speed_limit_kmh!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  odometer_km!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  value!: number;

  @Column({ type: 'jsonb' })
  raw_data!: object;

  @CreateDateColumn()
  created_at!: Date;
}
