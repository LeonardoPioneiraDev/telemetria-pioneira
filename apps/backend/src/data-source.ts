//apps/backend/src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { environment } from './config/environment.js';
import { logger } from './shared/utils/logger.js';

// Importe CADA entidade explicitamente
import { ApiCredential } from './entities/api-credential.entity.js';
import { ChangelogEntry } from './entities/changelog-entry.entity.js';
import { Driver } from './entities/driver.entity.js';
import { EtlControl } from './entities/etl-control.entity.js';
import { EventType } from './entities/event-type.entity.js';
import { HistoricalLoadControl } from './entities/historical-load-control.entity.js';
import { RequestLog } from './entities/request-log.entity.js';
import { TelemetryEvent } from './entities/telemetry-event.entity.js';
import { UserActivityLog } from './entities/user-activity-log.entity.js';
import { UserChangelogView } from './entities/user-changelog-view.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { UserPageView } from './entities/user-page-view.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';

// ✅ Detectar se está em produção (código compilado) ou desenvolvimento
const isCompiled = import.meta.url.includes('/dist/');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: environment.database.host,
  port: environment.database.port,
  username: environment.database.username,
  password: environment.database.password,
  database: environment.database.name,
  synchronize: false,
  logging: environment.database.logging,
  entities: [
    UserEntity,
    Driver,
    Vehicle,
    EventType,
    TelemetryEvent,
    ApiCredential,
    EtlControl,
    HistoricalLoadControl,
    ChangelogEntry,
    UserChangelogView,
    RequestLog,
    UserActivityLog,
    UserPageView,
  ],
  // ✅ Usar path correto baseado no ambiente
  migrations: isCompiled ? ['dist/migrations/**/*.js'] : ['src/migrations/**/*.ts'],

  // ✅ Connection Pool - otimizado para ETL + API concorrentes
  poolSize: 20, // Máximo de conexões no pool
  extra: {
    // Configurações do pg (node-postgres)
    max: 20, // Máximo de conexões
    min: 5, // Mínimo de conexões mantidas
    idleTimeoutMillis: 30000, // Fecha conexões ociosas após 30s
    connectionTimeoutMillis: 5000, // Timeout para obter conexão do pool
    statement_timeout: 60000, // Timeout de 60s para queries longas
  },
});

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
