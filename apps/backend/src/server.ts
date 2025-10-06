BigInt.prototype.toJSON = function () {
  return this.toString();
};
import { app } from './app.js';
import { environment } from './config/environment.js';
import { migrator } from './database/migrate.js';
import { logger } from './shared/utils/logger.js';

/**
 * Função principal para iniciar o servidor
 */
async function startServer(): Promise<void> {
  try {
    logger.info('🌟 Iniciando Telemetria Pioneira Backend...');
    logger.info(`🌍 Ambiente: ${environment.NODE_ENV}`);
    logger.info(`🏠 Host: ${environment.HOST}:${environment.PORT}`);

    // Executar migrações se necessário
    if (environment.NODE_ENV === 'development' || process.env['RUN_MIGRATIONS'] === 'true') {
      logger.info('🔄 Executando migrações...');
      await migrator.runMigrations();
    }

    // Iniciar aplicação
    await app.start();

    // Log de informações úteis
    logStartupInfo();
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar servidor:', error);
    process.exit(1);
  }
}

/**
 * Função para parar o servidor graciosamente
 */
async function stopServer(signal: string): Promise<void> {
  logger.info(`📡 Sinal ${signal} recebido. Parando servidor...`);

  try {
    await app.stop();
    logger.info('✅ Servidor parado com sucesso');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro ao parar servidor:', error);
    process.exit(1);
  }
}

/**
 * Log de informações úteis na inicialização
 */
function logStartupInfo(): void {
  const baseUrl = `http://${environment.HOST}:${environment.PORT}`;

  logger.info('🎉 Servidor iniciado com sucesso!');
  logger.info('📋 Informações do servidor:');
  logger.info(`   🌐 URL Base: ${baseUrl}`);
  logger.info(
    `   📚 Documentação: ${environment.swagger.enabled ? `${baseUrl}/docs` : 'Desabilitada'}`
  );
  logger.info(`   💚 Health Check: ${baseUrl}/health`);
  logger.info(`   🔐 Auth Endpoints: ${baseUrl}/api/auth`);
  logger.info(
    `   🗄️ Banco: ${environment.database.host}:${environment.database.port}/${environment.database.name}`
  );
  logger.info(`   📧 Email: ${environment.email.enabled ? 'Habilitado' : 'Desabilitado'}`);
  logger.info(
    `   🛡️ Rate Limiting: ${environment.rateLimit.enabled ? 'Habilitado' : 'Desabilitado'}`
  );
  logger.info(
    `   📊 Logs: ${environment.log.level} (${environment.log.toFile ? 'arquivo + ' : ''}console)`
  );

  if (environment.NODE_ENV === 'development') {
    logger.info('🔧 Modo Desenvolvimento:');
    logger.info(`   👑 Admin: ${environment.admin.email} / ${environment.admin.username}`);
    logger.info(
      `   👥 Usuários exemplo: ${environment.dev.createSampleUsers ? 'Criados' : 'Não criados'}`
    );
  }
}

/**
 * Configurar handlers para sinais do sistema
 */
function setupSignalHandlers(): void {
  // Parada graciosa
  process.on('SIGTERM', () => stopServer('SIGTERM'));
  process.on('SIGINT', () => stopServer('SIGINT'));

  // Tratamento de erros não capturados
  process.on('uncaughtException', error => {
    logger.error('🚨 Exceção não capturada:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚨 Promise rejeitada não tratada:', { reason, promise });
    process.exit(1);
  });

  // Log de informações do processo
  process.on('exit', code => {
    logger.info(`🏁 Processo finalizado com código: ${code}`);
  });
}

/**
 * Verificar variáveis de ambiente críticas
 */
function validateEnvironment(): void {
  const requiredVars = [
    'JWT_SECRET',
    'DATABASE_HOST',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('❌ Variáveis de ambiente obrigatórias não encontradas:', missingVars);
    logger.error('💡 Verifique o arquivo .env e configure as variáveis necessárias');
    process.exit(1);
  }

  logger.info('✅ Variáveis de ambiente validadas');
}

/**
 * Função principal
 */
async function main(): Promise<void> {
  try {
    // Configurar handlers de sinal
    setupSignalHandlers();

    // Validar ambiente
    validateEnvironment();

    // Iniciar servidor
    await startServer();
  } catch (error) {
    logger.error('💥 Erro fatal na inicialização:', error);
    process.exit(1);
  }
}

// Executar apenas se for o arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

export { startServer, stopServer };
