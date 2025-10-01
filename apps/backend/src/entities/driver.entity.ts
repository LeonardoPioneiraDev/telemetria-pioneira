//apps/backend/src/entities/driver.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true, comment: 'ID do motorista na API da MiX' })
  external_id!: bigint;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  employee_number!: string;

  @Column({ type: 'boolean', default: false })
  is_system_driver!: boolean;

  @Column({ type: 'jsonb', nullable: true, comment: 'Payload original completo da API' })
  raw_data!: object;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
