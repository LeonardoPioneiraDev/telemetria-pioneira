import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Driver } from './driver.entity';
import { EventType } from './event-type.entity';
import { Vehicle } from './vehicle.entity';

@Entity('telemetry_events')
export class TelemetryEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true, comment: 'ID do evento na API da MiX' })
  external_id!: number;

  @Column({ type: 'timestamptz' })
  occurred_at!: Date;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  speed_kmh!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  speed_limit_kmh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  odometer_km!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  value!: number;

  @Column({ type: 'jsonb', comment: 'Payload original completo da API' })
  raw_data!: object;

  @CreateDateColumn()
  created_at!: Date;

  // --- Relacionamentos ---

  @ManyToOne(() => Driver, driver => driver.events)
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @ManyToOne(() => Vehicle, vehicle => vehicle.events)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @ManyToOne(() => EventType, eventType => eventType.events)
  @JoinColumn({ name: 'event_type_id' })
  eventType!: EventType;
}
