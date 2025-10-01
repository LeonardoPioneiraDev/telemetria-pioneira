import { database } from '../config/database.js';
import { environment } from '../config/environment.js';
import { logger } from '../shared/utils/logger.js';

interface TableRow {
  table_name: string;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Inicializar conexão com o banco
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔄 Inicializando conexão com banco de dados...');

      await database.connect();
      this.isConnected = true;

      logger.info('✅ Conexão com banco de dados inicializada com sucesso');

      // Executar verificações de saúde
      await this.performHealthChecks();

      // Executar limpeza se habilitada
      if (environment.cleanup.enabled) {
        await this.performCleanup();
      }
    } catch (error) {
      logger.error('❌ Erro ao inicializar conexão com banco de dados:', error);
      throw error;
    }
  }

  /**
   * Verificações de saúde do banco
   */
  private async performHealthChecks(): Promise<void> {
    try {
      // Verificar se tabelas existem
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `;

      const tablesResult = await database.query(tablesQuery);
      const tables = tablesResult.rows.map((row: TableRow) => row.table_name);

      if (tables.includes('users')) {
        logger.info('✅ Tabela users encontrada');
      } else {
        logger.warn('⚠️ Tabela users não encontrada - execute as migrações');
      }

      // Verificar estatísticas de usuários
      if (tables.includes('users')) {
        const statsQuery = 'SELECT * FROM user_stats';
        const statsResult = await database.query(statsQuery);

        if (statsResult.rows.length > 0) {
          const stats = statsResult.rows[0];
          logger.info('📊 Estatísticas do banco:', {
            totalUsers: stats.total_users,
            activeUsers: stats.active_users,
            adminUsers: stats.admin_users,
          });
        }
      }
    } catch (error) {
      logger.warn('⚠️ Falha nas verificações de saúde do banco:', error);
    }
  }

  /**
   * Executar limpeza automática
   */
  private async performCleanup(): Promise<void> {
    try {
      logger.info('🧹 Executando limpeza automática...');

      // Limpar tokens expirados
      if (environment.cleanup.expiredTokens) {
        await database.query('SELECT cleanup_expired_tokens()');
        logger.info('🧹 Tokens expirados limpos');
      }

      // Limpar tentativas de login antigas
      if (environment.cleanup.failedLoginAttempts) {
        const cleanupQuery = `
          UPDATE users 
          SET login_attempts = 0, locked_until = NULL 
          WHERE locked_until < NOW() - INTERVAL '1 day'
        `;
        const result = await database.query(cleanupQuery);
        logger.info(`🧹 ${result.rowCount} contas desbloqueadas`);
      }
    } catch (error) {
      logger.warn('⚠️ Falha na limpeza automática:', error);
    }
  }

  /**
   * Verificar se está conectado
   */
  public isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Obter informações da conexão
   */
  public async getConnectionInfo(): Promise<any> {
    try {
      const poolInfo = database.getPoolInfo();
      const healthCheck = await database.healthCheck();

      return {
        isConnected: this.isConnected,
        pool: poolInfo,
        health: healthCheck,
        database: {
          host: environment.database.host,
          port: environment.database.port,
          name: environment.database.name,
        },
      };
    } catch (error) {
      logger.error('Erro ao obter informações da conexão:', error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Fechar conexão
   */
  public async close(): Promise<void> {
    try {
      await database.close();
      this.isConnected = false;
      logger.info('🔌 Conexão com banco de dados encerrada');
    } catch (error) {
      logger.error('Erro ao fechar conexão:', error);
    }
  }
}

export const databaseConnection = DatabaseConnection.getInstance();
export default databaseConnection;
