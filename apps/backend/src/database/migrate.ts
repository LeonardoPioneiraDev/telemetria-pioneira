import { readFileSync } from 'fs';
import { join } from 'path';
import { database } from '../config/database.js';
import { environment } from '../config/environment.js';
import { logger } from '../shared/utils/logger.js';
import { passwordService } from '../shared/utils/password.js';

interface ExecutedMigrationRow {
  filename: string;
}
export class DatabaseMigrator {
  private static instance: DatabaseMigrator;

  private constructor() {}

  public static getInstance(): DatabaseMigrator {
    if (!DatabaseMigrator.instance) {
      DatabaseMigrator.instance = new DatabaseMigrator();
    }
    return DatabaseMigrator.instance;
  }

  /**
   * Executar todas as migrações
   */
  public async runMigrations(): Promise<void> {
    try {
      logger.info('🔄 Iniciando execução das migrações...');

      // Conectar ao banco
      await database.connect();

      // Criar tabela de controle de migrações se não existir
      await this.createMigrationsTable();

      // Executar migrações pendentes
      await this.executePendingMigrations();

      // Criar usuário admin se habilitado
      if (environment.admin.autoCreate) {
        await this.createAdminUser();
      }

      // Criar usuários de exemplo se habilitado
      if (environment.dev.createSampleUsers && environment.NODE_ENV === 'development') {
        await this.createSampleUsers();
      }

      logger.info('✅ Migrações executadas com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao executar migrações:', error);
      throw error;
    }
  }

  /**
   * Criar tabela de controle de migrações
   */
  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `;

    await database.query(query);
    logger.info('📋 Tabela de migrações verificada');
  }

  /**
   * Executar migrações pendentes
   */
  private async executePendingMigrations(): Promise<void> {
    const migrationsDir = join(process.cwd(), 'src', 'database', 'migrations');
    const migrationFiles = ['001_create_users_table.sql'];

    for (const filename of migrationFiles) {
      try {
        // Verificar se migração já foi executada
        const checkQuery = 'SELECT id FROM migrations WHERE filename = $1';
        const checkResult = await database.query(checkQuery, [filename]);

        if (checkResult.rows.length > 0) {
          logger.info(`⏭️ Migração ${filename} já executada`);
          continue;
        }

        // Ler arquivo de migração
        const migrationPath = join(migrationsDir, filename);
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        // Executar migração
        logger.info(`🔄 Executando migração: ${filename}`);
        await database.query(migrationSQL);

        // Registrar migração como executada
        const insertQuery = 'INSERT INTO migrations (filename) VALUES ($1)';
        await database.query(insertQuery, [filename]);

        logger.info(`✅ Migração ${filename} executada com sucesso`);
      } catch (error) {
        logger.error(`❌ Erro ao executar migração ${filename}:`, error);
        throw error;
      }
    }
  }

  /**
   * Criar usuário administrador
   */
  private async createAdminUser(): Promise<void> {
    try {
      // Verificar se admin já existe
      const checkQuery = 'SELECT id FROM users WHERE email = $1 OR username = $2';
      const checkResult = await database.query(checkQuery, [
        environment.admin.email,
        environment.admin.username,
      ]);

      if (checkResult.rows.length > 0) {
        logger.info('👑 Usuário administrador já existe');
        return;
      }

      // Validar dados do admin
      if (!environment.admin.email || !environment.admin.password) {
        logger.warn('⚠️ Dados do administrador não configurados nas variáveis de ambiente');
        return;
      }

      // Hash da senha
      const hashedPassword = await passwordService.hashPassword(environment.admin.password);

      // Criar usuário admin
      const insertQuery = `
        INSERT INTO users (
          email, username, full_name, password, role, status, 
          email_verified, email_verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;

      const values = [
        environment.admin.email,
        environment.admin.username,
        environment.admin.fullName,
        hashedPassword,
        'admin',
        'active',
        true,
      ];

      await database.query(insertQuery, values);

      logger.info('👑 Usuário administrador criado com sucesso', {
        email: environment.admin.email,
        username: environment.admin.username,
      });
    } catch (error) {
      logger.error('❌ Erro ao criar usuário administrador:', error);
      throw error;
    }
  }

  /**
   * Criar usuários de exemplo para desenvolvimento
   */
  private async createSampleUsers(): Promise<void> {
    try {
      logger.info('👥 Criando usuários de exemplo...');

      const sampleUsers = [
        {
          email: 'suporte@vpioneira.com.br',
          username: 'TI',
          fullName: 'TI Admin',
          password: '123456',
          role: 'admin',
        },
      ];

      for (const userData of sampleUsers) {
        try {
          // Verificar se usuário já existe
          const checkQuery = 'SELECT id FROM users WHERE email = $1 OR username = $2';
          const checkResult = await database.query(checkQuery, [userData.email, userData.username]);

          if (checkResult.rows.length > 0) {
            logger.info(`👤 Usuário ${userData.username} já existe`);
            continue;
          }

          // Hash da senha
          const hashedPassword = await passwordService.hashPassword(userData.password);

          // Criar usuário
          const insertQuery = `
            INSERT INTO users (
              email, username, full_name, password, role, status, 
              email_verified, email_verified_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `;

          const values = [
            userData.email,
            userData.username,
            userData.fullName,
            hashedPassword,
            userData.role,
            'active',
            true,
          ];

          await database.query(insertQuery, values);

          logger.info(`👤 Usuário ${userData.username} criado com sucesso`);
        } catch (error) {
          logger.warn(`⚠️ Erro ao criar usuário ${userData.username}:`, error);
        }
      }
    } catch (error) {
      logger.error('❌ Erro ao criar usuários de exemplo:', error);
    }
  }

  /**
   * Reverter última migração
   */
  public async rollbackLastMigration(): Promise<void> {
    try {
      logger.info('🔄 Revertendo última migração...');

      // Obter última migração
      const query = 'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1';
      const result = await database.query(query);

      if (result.rows.length === 0) {
        logger.info('ℹ️ Nenhuma migração para reverter');
        return;
      }

      const lastMigration = result.rows[0].filename;
      logger.warn(`⚠️ Revertendo migração: ${lastMigration}`);

      // Por segurança, apenas permitir rollback em desenvolvimento
      if (environment.NODE_ENV !== 'development') {
        throw new Error('Rollback só é permitido em ambiente de desenvolvimento');
      }

      // Remover da tabela de migrações
      const deleteQuery = 'DELETE FROM migrations WHERE filename = $1';
      await database.query(deleteQuery, [lastMigration]);

      logger.info(`✅ Migração ${lastMigration} revertida`);
    } catch (error) {
      logger.error('❌ Erro ao reverter migração:', error);
      throw error;
    }
  }

  /**
   * Obter status das migrações
   */
  public async getMigrationStatus(): Promise<{
    executed: string[];
    pending: string[];
  }> {
    try {
      // Obter migrações executadas
      const executedQuery = 'SELECT filename FROM migrations ORDER BY executed_at';
      const executedResult = await database.query(executedQuery);
      const executed = executedResult.rows.map((row: ExecutedMigrationRow) => row.filename);

      // Lista de todas as migrações disponíveis
      const allMigrations = ['001_create_users_table.sql'];
      const pending = allMigrations.filter(migration => !executed.includes(migration));

      return { executed, pending };
    } catch (error) {
      logger.error('Erro ao obter status das migrações:', error);
      throw error;
    }
  }
}

export const migrator = DatabaseMigrator.getInstance();

// Executar migrações se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrator
    .runMigrations()
    .then(() => {
      logger.info('🎉 Migrações concluídas');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 Falha nas migrações:', error);
      process.exit(1);
    });
}

export default migrator;
