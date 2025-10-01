import { Pool, PoolConfig } from 'pg';
import { logger } from '../shared/utils/logger.js';
import { environment } from './environment.js';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private pool: Pool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    try {
      const config: PoolConfig = {
        host: environment.database.host,
        port: environment.database.port,
        user: environment.database.username,
        password: environment.database.password,
        database: environment.database.name,
        max: environment.database.maxConnections,
        connectionTimeoutMillis: environment.database.connectionTimeout,
        query_timeout: environment.database.queryTimeout,
        ssl: environment.database.ssl
          ? {
              rejectUnauthorized: false,
            }
          : false,
        application_name: 'telemetria-pioneira-backend',
      };

      this.pool = new Pool(config);

      // Event listeners para monitoramento
      this.pool.on('connect', () => {
        if (environment.log.debug.database) {
          logger.debug('🔌 Nova conexão estabelecida com o banco de dados');
        }
      });

      this.pool.on('error', err => {
        logger.error('❌ Erro inesperado no cliente do banco de dados:', err);
      });

      this.pool.on('acquire', () => {
        if (environment.log.performance.connections) {
          logger.debug('🔗 Cliente do pool adquirido');
        }
      });

      this.pool.on('release', err => {
        if (err) {
          logger.error('❌ Erro ao liberar cliente do pool:', err);
        } else if (environment.log.performance.connections) {
          logger.debug('🔓 Cliente do pool liberado');
        }
      });

      // Teste de conexão
      await this.testConnection();

      logger.info('✅ Conexão com banco de dados estabelecida com sucesso');
      return this.pool;
    } catch (error) {
      logger.error('❌ Erro ao conectar com o banco de dados:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Pool de conexões não inicializado');
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();

      if (environment.log.debug.database) {
        logger.debug('🔍 Teste de conexão realizado:', {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].version.split(' ')[0],
        });
      }

      return true;
    } catch (error) {
      logger.error('❌ Falha no teste de conexão:', error);
      throw error;
    }
  }

  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Pool de conexões não inicializado');
    }

    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // Log de queries lentas
      if (
        environment.log.performance.slowQueries &&
        duration > environment.log.performance.slowQueryThreshold
      ) {
        logger.warn('🐌 Query lenta detectada:', {
          query: text,
          duration: `${duration}ms`,
          params: params ? '[HIDDEN]' : undefined,
        });
      }

      if (environment.log.debug.database) {
        logger.debug('📊 Query executada:', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rowCount: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('❌ Erro na execução da query:', {
        query: text,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  public async getClient() {
    if (!this.pool) {
      throw new Error('Pool de conexões não inicializado');
    }
    return await this.pool.connect();
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('🔌 Conexão com banco de dados encerrada');
    }
  }

  public getPoolInfo() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const start = Date.now();
      await this.testConnection();
      const responseTime = Date.now() - start;

      const poolInfo = this.getPoolInfo();

      return {
        status: 'healthy',
        details: {
          responseTime: `${responseTime}ms`,
          pool: poolInfo,
          database: environment.database.name,
          host: environment.database.host,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          database: environment.database.name,
          host: environment.database.host,
        },
      };
    }
  }
}

export const database = DatabaseConfig.getInstance();
export default database;
