import Fastify, { FastifyInstance } from 'fastify';
import { emailService } from './config/email.js';
import { environment } from './config/environment.js';
import { databaseConnection } from './database/connection.js';
import { authRoutes } from './modules/auth/routes/authRoutes.js';
import { Scheduler } from './scheduler.js';
import { corsConfig } from './shared/middleware/corsConfig.js';
import { errorHandlerPlugin } from './shared/middleware/errorHandler.js';
import { rateLimiter } from './shared/middleware/rateLimiter.js';
import { logger } from './shared/utils/logger.js';
// Plugins do Fastify
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initializeDataSource } from './data-source.js';

export class Application {
  private static instance: Application;
  private fastify: FastifyInstance;
  private isInitialized: boolean = false;

  private constructor() {
    this.fastify = Fastify({
      logger: false, // Usar nosso logger customizado
      trustProxy: environment.trustProxy,
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'requestId',
      maxParamLength: 500,
      bodyLimit: 10 * 1024 * 1024, // 10MB
      keepAliveTimeout: 30000,
      connectionTimeout: 30000,
    });
  }

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  /**
   * Inicializar aplicação
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Inicializando aplicação...');

      // Registrar plugins essenciais
      await this.registerEssentialPlugins();

      // Configurar middlewares
      await this.setupMiddlewares();

      // Configurar autenticação
      await this.setupAuthentication();

      // Configurar documentação
      if (environment.swagger.enabled) {
        await this.setupSwagger();
      }

      // Registrar rotas
      await this.registerRoutes();

      // Configurar tratamento de erros
      await this.setupErrorHandling();

      // Configurar hooks
      await this.setupHooks();

      // Inicializar serviços externos
      await this.initializeExternalServices();

      this.isInitialized = true;
      logger.info('✅ Aplicação inicializada com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao inicializar aplicação:', error);
      throw error;
    }
  }

  /**
   * Registrar plugins essenciais
   */
  private async registerEssentialPlugins(): Promise<void> {
    // Helmet para segurança
    if (environment.helmet.enabled) {
      await this.fastify.register(helmet, {
        contentSecurityPolicy: environment.helmet.cspEnabled ? undefined : false,
        crossOriginEmbedderPolicy: environment.helmet.crossOriginEmbedderPolicy,
      });
      logger.info('🛡️ Helmet configurado');
    }

    // Compressão
    if (environment.compression.enabled) {
      await this.fastify.register(import('@fastify/compress'), {
        global: true,
        threshold: 1024,
        encodings: ['gzip', 'deflate'],
      });
      logger.info('🗜️ Compressão configurada');
    }
  }

  /**
   * Configurar middlewares
   */
  private async setupMiddlewares(): Promise<void> {
    // CORS
    await corsConfig.registerCors(this.fastify);

    // Rate Limiting
    await rateLimiter.registerGlobalRateLimit(this.fastify);

    // Headers de segurança customizados
    this.fastify.addHook('onSend', corsConfig.addSecurityHeaders());

    logger.info('🔧 Middlewares configurados');
  }

  /**
   * Configurar autenticação JWT
   */
  private async setupAuthentication(): Promise<void> {
    await this.fastify.register(jwt, {
      secret: environment.jwt.secret,
      sign: {
        expiresIn: environment.jwt.expiresIn,
        issuer: 'telemetria-pioneira',
        audience: 'telemetria-users',
      },
      verify: {
        issuer: 'telemetria-pioneira',
        audience: 'telemetria-users',
      },
    });

    // Decorar fastify com método de autenticação
    this.fastify.decorate('authenticate', async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    logger.info('🔐 Autenticação JWT configurada');
  }

  /**
   * Configurar documentação Swagger
   */
  private async setupSwagger(): Promise<void> {
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Telemetria Pioneira API',
          description: 'API completa para sistema de telemetria com autenticação',
          version: '1.0.0',
          contact: {
            name: 'Leonardo Lopes',
            email: 'leonardolopes@vpioneira.com.br',
          },
        },
        host: `${environment.HOST}:${environment.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Token JWT no formato: Bearer <token>',
          },
        },
        tags: [
          { name: 'Autenticação', description: 'Endpoints de autenticação e autorização' },
          { name: 'Perfil', description: 'Gerenciamento de perfil do usuário' },
          { name: 'Administração', description: 'Endpoints administrativos' },
          { name: 'Sistema', description: 'Endpoints de sistema e saúde' },
        ],
      },
    });

    await this.fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      },
      staticCSP: true,
      transformStaticCSP: header => header,
      transformSpecification: swaggerObject => {
        return swaggerObject;
      },
    });

    logger.info('📚 Documentação Swagger configurada em /docs');
  }

  /**
   * Registrar rotas
   */
  private async registerRoutes(): Promise<void> {
    // Rota de saúde
    this.fastify.get(
      '/health',
      {
        schema: {
          description: 'Verificar saúde da aplicação',
          tags: ['Sistema'],
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string' },
                    uptime: { type: 'number' },
                    services: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      this.healthCheck.bind(this)
    );

    // Rota raiz
    this.fastify.get(
      '/',
      {
        schema: {
          description: 'Informações da API',
          tags: ['Sistema'],
        },
      },
      this.rootHandler.bind(this)
    );

    // Registrar rotas de autenticação
    await this.fastify.register(authRoutes, { prefix: '/api' });

    // Rota 404 personalizada
    this.fastify.setNotFoundHandler(this.notFoundHandler.bind(this));

    logger.info('🛣️ Rotas registradas');
  }

  /**
   * Configurar tratamento de erros
   */
  private async setupErrorHandling(): Promise<void> {
    await this.fastify.register(errorHandlerPlugin);
    logger.info('🚨 Tratamento de erros configurado');
  }

  /**
   * Configurar hooks
   */
  private async setupHooks(): Promise<void> {
    // Hook de request
    this.fastify.addHook('onRequest', async (request, reply) => {
      const start = Date.now();
      request.startTime = start;

      logger.info('📥 Request recebido', {
        requestId: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    });

    // Hook de response
    this.fastify.addHook('onSend', async (request, reply, payload) => {
      const duration = Date.now() - (request as any).startTime;

      logger.info('📤 Response enviado', {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      });

      return payload;
    });

    // Hook de erro
    this.fastify.addHook('onError', async (request, reply, error) => {
      logger.error('🚨 Erro na requisição', {
        requestId: request.id,
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack,
      });
    });

    logger.info('🪝 Hooks configurados');
  }

  /**
   * Inicializar serviços externos
   */
  private async initializeExternalServices(): Promise<void> {
    await initializeDataSource();
    logger.info('✅ Conexão do TypeORM com o banco de dados estabelecida!');

    // Inicializar serviço de email
    await emailService.initialize();
    Scheduler.start();
    logger.info('🔌 Serviços externos inicializados');
  }

  /**
   * Handler para rota raiz
   */
  private async rootHandler(request: any, reply: any) {
    return {
      success: true,
      message: 'Telemetria Pioneira API',
      data: {
        version: '1.0.0',
        environment: environment.NODE_ENV,
        timestamp: new Date().toISOString(),
        documentation: environment.swagger.enabled ? '/docs' : 'Documentação desabilitada',
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          docs: '/docs',
        },
      },
    };
  }

  /**
   * Handler para verificação de saúde
   */
  private async healthCheck(request: any, reply: any) {
    try {
      const startTime = Date.now();

      // Verificar serviços
      const services: any = {};

      // Verificar banco de dados
      if (environment.healthCheck.database) {
        const dbHealth = await databaseConnection.getConnectionInfo();
        services.database = {
          status: dbHealth.isConnected ? 'healthy' : 'unhealthy',
          details: dbHealth,
        };
      }

      // Verificar email
      const emailHealth = await emailService.healthCheck();
      services.email = emailHealth;

      // Verificar memória
      if (environment.healthCheck.memory) {
        const memUsage = process.memoryUsage();
        services.memory = {
          status: 'healthy',
          details: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          },
        };
      }

      // Determinar status geral
      const allHealthy = Object.values(services).every(
        (service: any) => service.status === 'healthy'
      );

      const responseTime = Date.now() - startTime;

      const healthData = {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        services,
      };

      const statusCode = allHealthy ? 200 : 503;

      return reply.status(statusCode).send({
        success: allHealthy,
        message: `Sistema ${allHealthy ? 'saudável' : 'com problemas'}`,
        data: healthData,
      });
    } catch (error) {
      logger.error('Erro no health check:', error);
      return reply.status(503).send({
        success: false,
        message: 'Erro na verificação de saúde',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });
    }
  }

  /**
   * Handler para rotas não encontradas
   */
  private async notFoundHandler(request: any, reply: any) {
    return reply.status(404).send({
      success: false,
      message: 'Rota não encontrada',
      error: 'NOT_FOUND',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
    });
  }

  /**
   * Iniciar servidor
   */
  public async start(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const address = await this.fastify.listen({
        host: environment.HOST,
        port: environment.PORT,
      });

      logger.info('🚀 Servidor iniciado com sucesso', {
        address,
        environment: environment.NODE_ENV,
        documentation: environment.swagger.enabled ? `${address}/docs` : 'Desabilitada',
      });
    } catch (error) {
      logger.error('❌ Erro ao iniciar servidor:', error);
      throw error;
    }
  }

  /**
   * Parar servidor
   */
  public async stop(): Promise<void> {
    try {
      await this.fastify.close();
      await databaseConnection.close();
      logger.info('🛑 Servidor parado com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao parar servidor:', error);
      throw error;
    }
  }

  /**
   * Obter instância do Fastify
   */
  public getFastify(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Verificar se está inicializado
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

export const app = Application.getInstance();
export default app;
