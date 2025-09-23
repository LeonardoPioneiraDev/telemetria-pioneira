// src/entities/api-credential.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_credentials')
export class ApiCredential {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: 'text', comment: 'Token de acesso para a API da MiX' })
  access_token!: string;

  @Column({ type: 'text', comment: 'Token para renovar o acesso sem usar a senha' })
  refresh_token!: string;

  @Column({ type: 'timestamptz', comment: 'Data e hora em que o token de acesso expira' })
  expires_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
