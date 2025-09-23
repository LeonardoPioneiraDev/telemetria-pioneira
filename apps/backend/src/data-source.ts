import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { environment } from './config/environment.js';
import { logger } from './shared/utils/logger.js';

// Importe CADA entidade explicitamente
import { ApiCredential } from './entities/api-credential.entity.js';
import { Driver } from './entities/driver.entity.js';
import { EtlControl } from './entities/etl-control.entity.js';
import { EventType } from './entities/event-type.entity.js';
import { TelemetryEvent } from './entities/telemetry-event.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';

// Exportamos a instância do DataSource, mas ainda não inicializada
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: environment.database.host,
  port: environment.database.port,
  username: environment.database.username,
  password: environment.database.password,
  database: environment.database.name,
  synchronize: environment.database.synchronize,
  logging: environment.database.logging,
  entities: [Driver, Vehicle, EventType, TelemetryEvent, ApiCredential, EtlControl],
  migrations: ['src/migrations/**/*.ts'],
});

// Criamos uma função de inicialização que pode ser chamada por qualquer processo
export async function initializeDataSource(): Promise<void> {
  if (AppDataSource.isInitialized) {
    logger.debug('DataSource já inicializado.');
    return;
  }
  try {
    await AppDataSource.initialize();
    logger.info('✅ Conexão do TypeORM com o banco de dados estabelecida!');
  } catch (error) {
    logger.error('❌ Erro ao inicializar o DataSource do TypeORM:', error);
    throw error;
  }
}
