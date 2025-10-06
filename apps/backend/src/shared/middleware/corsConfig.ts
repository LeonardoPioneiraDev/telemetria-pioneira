//apps/backend/src/shared/middleware/corsConfig.ts
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { environment } from '../../config/environment.js';
import { logger } from '../utils/logger.js';

export class CorsConfig {
  private static instance: CorsConfig;

  private constructor() {}

  public static getInstance(): CorsConfig {
    if (!CorsConfig.instance) {
      CorsConfig.instance = new CorsConfig();
    }
    return CorsConfig.instance;
  }

  /**
   * Registra CORS no Fastify com configuração otimizada
   */
  public async registerCors(fastify: FastifyInstance): Promise<void> {
    const isDev = environment.NODE_ENV === 'development';

    await fastify.register(cors, {
      origin: isDev ? true : environment.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-Request-ID',
      ],
      exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
      maxAge: 86400,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    // Log apenas em desenvolvimento
    if (isDev) {
      fastify.addHook('onRequest', async (request, _reply) => {
        if (request.method === 'OPTIONS') {
          logger.debug('CORS Preflight:', {
            origin: request.headers.origin,
            method: request.headers['access-control-request-method'],
          });
        }
      });

      logger.info('CORS: Modo desenvolvimento - todas origens permitidas');
    } else {
      logger.info('CORS configurado', {
        allowedOrigins: environment.cors.origin,
        credentials: true,
      });
    }

    // Adiciona headers de segurança automaticamente
    this.addSecurityHeaders(fastify);
  }

  /**
   * Adiciona headers de segurança (chamado internamente)
   */
  private addSecurityHeaders(fastify: FastifyInstance): void {
    fastify.addHook('onSend', async (_request, reply, _payload) => {
      reply.removeHeader('X-Powered-By');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

      if (environment.helmet.cspEnabled) {
        reply.header(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        );
      }
    });
  }
}

export const corsConfig = CorsConfig.getInstance();
export default corsConfig;
