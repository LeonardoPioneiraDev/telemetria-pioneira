// src/entities/etl-control.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('etl_control')
export class EtlControl {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, comment: 'Nome do processo, ex: event_ingestion' })
  process_name!: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Último sinceToken processado com sucesso' })
  last_successful_sincetoken!: string;

  @UpdateDateColumn()
  last_run_timestamp!: Date;
}
