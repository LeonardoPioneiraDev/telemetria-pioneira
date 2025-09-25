//apps/backend/src/entities/event-type.entity.ts
import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('event_types')
export class EventType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true, comment: 'ID do tipo de evento na API da MiX' })
  external_id!: number;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  event_type_name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  display_units!: string;
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Classificação de negócio do evento',
  })
  classification!: string | null;
  @Column({ type: 'jsonb', nullable: true, comment: 'Payload original completo da API' })
  raw_data!: object;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => TelemetryEvent, event => event.eventType)
  events!: TelemetryEvent[];
}
