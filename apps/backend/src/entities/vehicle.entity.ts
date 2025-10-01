import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true, comment: 'ID do veículo (asset) na API da MiX' })
  external_id!: bigint;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  registration_number!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fleet_number!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  make!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  year!: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Payload original completo da API' })
  raw_data!: object;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
