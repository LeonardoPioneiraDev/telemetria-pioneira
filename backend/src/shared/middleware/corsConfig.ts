import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { environment } from '../../config/environment.js';
import { logger } from '../utils/logger.js';

export interface CorsOptions {
  origin: boolean | string | string[] | RegExp | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

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
   * Configurar CORS dinamicamente baseado no ambiente
   */
  private getOriginHandler(): (origin: string, callback: (err: Error | null, allow?: boolean) => void) => void {
    return (origin, callback) => {
      // Permitir requisições sem origin (ex: mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Em desenvolvimento, ser mais permissivo
      if (environment.NODE_ENV === 'development') {
        // Permitir localhost em qualquer porta
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          logger.debug('CORS: Origem localhost permitida', { origin });
          return callback(null, true);
        }
      }

      // Verificar se a origem está na lista permitida
      const allowedOrigins = environment.cors.origin;
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Suporte a wildcards simples
        if (allowedOrigin.includes('*')) {
          const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
          return regex.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        logger.debug('CORS: Origem permitida', { origin });
        callback(null, true);
      } else {
        logger.warn('CORS: Origem bloqueada', { origin, allowedOrigins });
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`), false);
      }
    };
  }

  /**
   * Obter configurações do CORS
   */
  public getCorsOptions(): CorsOptions {
    return {
      origin: this.getOriginHandler(),
      methods: environment.cors.methods,
      allowedHeaders: environment.cors.allowedHeaders,
      credentials: environment.cors.credentials,
      maxAge: environment.cors.maxAge,
      preflightContinue: false,
      optionsSuccessStatus: 204
    };
  }

  /**
   * Plugin para registrar CORS no Fastify
   */
  public async registerCors(fastify: FastifyInstance): Promise<void> {
    try {
      const corsOptions = this.getCorsOptions();
      
      await fastify.register(cors, corsOptions);
      
      logger.info('✅ CORS configurado com sucesso', {
        allowedOrigins: environment.cors.origin,
        methods: environment.cors.methods,
        credentials: environment.cors.credentials
      });

      // Hook para log de requisições CORS
      fastify.addHook('onRequest', async (request, reply) => {
        const origin = request.headers.origin;
        const method = request.method;
        
        if (origin && method === 'OPTIONS') {
          logger.debug('CORS Preflight:', {
            origin,
            method: request.headers['access-control-request-method'],
            headers: request.headers['access-control-request-headers']
          });
        }
      });

    } catch (error) {
      logger.error('❌ Erro ao configurar CORS:', error);
      throw error;
    }
  }

  /**
   * Middleware customizado para headers de segurança
   */
  public addSecurityHeaders() {
    return async (request: any, reply: any) => {
      // Headers de segurança adicionais
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Remover header que expõe tecnologia
      reply.removeHeader('X-Powered-By');
      
      // CSP básico (pode ser customizado conforme necessário)
      if (environment.helmet.cspEnabled) {
        reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
      }
    };
  }

  /**
   * Validar configurações de CORS
   */
  public validateCorsConfig(): boolean {
    const { origin, methods, allowedHeaders } = environment.cors;

    if (!origin || origin.length === 0) {
      logger.error('❌ CORS: Nenhuma origem configurada');
      return false;
    }

    if (!methods || methods.length === 0) {
      logger.error('❌ CORS: Nenhum método HTTP configurado');
      return false;
    }

    if (!allowedHeaders || allowedHeaders.length === 0) {
      logger.error('❌ CORS: Nenhum header permitido configurado');
      return false;
    }

    logger.info('✅ Configuração CORS validada com sucesso');
    return true;
  }
}

export const corsConfig = CorsConfig.getInstance();
export default corsConfig;