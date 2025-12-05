import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { environment } from '../../config/environment.js';
import { logger, securityLogger } from '../utils/logger.js';
import { responseHelper } from '../utils/responseHelper.js';

export interface RateLimitOptions {
  max: number;
  timeWindow: number;
  skipOnError?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: FastifyRequest) => string;
  errorResponseBuilder?: (request: FastifyRequest, context: any) => any;
  onExceeding?: (request: FastifyRequest, key: string) => void;
  onExceeded?: (request: FastifyRequest, key: string) => void;
}

export class RateLimiterConfig {
  private static instance: RateLimiterConfig;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {}

  public static getInstance(): RateLimiterConfig {
    if (!RateLimiterConfig.instance) {
      RateLimiterConfig.instance = new RateLimiterConfig();
    }
    return RateLimiterConfig.instance;
  }

  /**
   * Gerador de chave personalizado
   */
  private generateKey(request: FastifyRequest, prefix: string = 'global'): string {
    const ip = request.ip;
    const userId = (request.user as any)?.id;

    if (userId) {
      return `${prefix}:user:${userId}`;
    }

    return `${prefix}:ip:${ip}`;
  }

  /**
   * Configuração global de rate limiting
   */
  public getGlobalRateLimitOptions(): RateLimitOptions {
    return {
      max: environment.rateLimit.global.limit,
      timeWindow: environment.rateLimit.global.ttl,
      skipOnError: true,
      keyGenerator: request => this.generateKey(request, 'global'),
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          message: 'Muitas requisições. Tente novamente mais tarde.',
          error: 'RATE_LIMIT_EXCEEDED',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
            retryAfter: Math.ceil(context.ttl / 1000),
          },
        };
      },
      onExceeding: (request, key) => {
        logger.debug('Rate limit próximo do limite', {
          key,
          ip: request.ip,
          url: request.url,
          method: request.method,
        });
      },
      onExceeded: (request, key) => {
        securityLogger.error('Rate limit excedido', {
          key,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          url: request.url,
          method: request.method,
          userId: (request.user as any)?.id,
        });
      },
    };
  }

  /**
   * Configuração de rate limiting para autenticação
   */
  public getAuthRateLimitOptions(): RateLimitOptions {
    return {
      max: environment.rateLimit.auth.limit,
      timeWindow: environment.rateLimit.auth.ttl,
      skipOnError: false,
      skipSuccessfulRequests: true, // Não contar logins bem-sucedidos
      keyGenerator: request => this.generateKey(request, 'auth'),
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          message: 'Muitas tentativas de login. Tente novamente mais tarde.',
          error: 'TOO_MANY_LOGIN_ATTEMPTS',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
            retryAfter: Math.ceil(context.ttl / 1000),
          },
        };
      },
      onExceeded: (request, key) => {
        securityLogger.error('Muitas tentativas de login', {
          key,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          email: (request.body as any)?.email || 'não informado',
        });
      },
    };
  }

  /**
   * Configuração de rate limiting para reset de senha
   */
  public getPasswordResetRateLimitOptions(): RateLimitOptions {
    return {
      max: environment.rateLimit.passwordReset.limit,
      timeWindow: environment.rateLimit.passwordReset.ttl,
      skipOnError: false,
      keyGenerator: request => {
        const email = (request.body as any)?.email;
        return email
          ? `password_reset:email:${email}`
          : this.generateKey(request, 'password_reset');
      },
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          message: 'Muitas tentativas de recuperação de senha. Tente novamente mais tarde.',
          error: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
            retryAfter: Math.ceil(context.ttl / 1000),
          },
        };
      },
      onExceeded: (request, key) => {
        securityLogger.warn('Rate limit de reset de senha excedido', {
          key,
          ip: request.ip,
          email: (request.body as any)?.email || 'não informado',
        });
      },
    };
  }

  /**
   * Middleware customizado para rate limiting específico
   */
  public createCustomRateLimit(options: {
    max: number;
    timeWindow: number;
    keyPrefix: string;
    message?: string;
    skipSuccessful?: boolean;
  }) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const key = this.generateKey(request, options.keyPrefix);
      const now = Date.now();
      const windowStart = now - options.timeWindow;

      // Limpar entradas expiradas
      this.cleanupExpiredEntries(windowStart);

      // Verificar limite atual
      const current = this.rateLimitStore.get(key);

      if (current && current.resetTime > now) {
        if (current.count >= options.max) {
          const retryAfter = Math.ceil((current.resetTime - now) / 1000);

          securityLogger.warn('Rate limit customizado excedido', {
            key,
            count: current.count,
            max: options.max,
            retryAfter,
          });

          return responseHelper.rateLimitError(
            reply,
            options.message || 'Limite de requisições excedido'
          );
        }

        // Incrementar contador
        current.count++;
      } else {
        // Criar nova entrada
        this.rateLimitStore.set(key, {
          count: 1,
          resetTime: now + options.timeWindow,
        });
      }
    };
  }

  /**
   * Limpar entradas expiradas do store
   */
  private cleanupExpiredEntries(windowStart: number): void {
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime <= windowStart) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Registrar rate limiting global
   */
  public async registerGlobalRateLimit(fastify: FastifyInstance): Promise<void> {
    if (!environment.rateLimit.enabled) {
      logger.info('⚡ Rate limiting desabilitado');
      return;
    }

    try {
      await fastify.register(rateLimit, this.getGlobalRateLimitOptions());

      logger.info('✅ Rate limiting global configurado', {
        max: environment.rateLimit.global.limit,
        timeWindow: `${environment.rateLimit.global.ttl}ms`,
      });
    } catch (error) {
      logger.error('❌ Erro ao configurar rate limiting global:', error);
      throw error;
    }
  }

  /**
   * Middleware para rotas de autenticação
   */
  public getAuthRateLimit() {
    return this.createCustomRateLimit({
      max: environment.rateLimit.auth.limit,
      timeWindow: environment.rateLimit.auth.ttl,
      keyPrefix: 'auth',
      message: 'Muitas tentativas de login. Tente novamente mais tarde.',
      skipSuccessful: true,
    });
  }

  /**
   * Middleware para reset de senha
   */
  public getPasswordResetRateLimit() {
    return this.createCustomRateLimit({
      max: environment.rateLimit.passwordReset.limit,
      timeWindow: environment.rateLimit.passwordReset.ttl,
      keyPrefix: 'password_reset',
      message: 'Muitas tentativas de recuperação de senha. Tente novamente mais tarde.',
    });
  }

  /**
   * Middleware para APIs sensíveis
   */
  public getSensitiveApiRateLimit() {
    return this.createCustomRateLimit({
      max: 10,
      timeWindow: 60 * 1000, // 1 minuto
      keyPrefix: 'sensitive_api',
      message: 'Muitas requisições para API sensível. Tente novamente mais tarde.',
    });
  }

  /**
   * Obter estatísticas do rate limiting
   */
  public getRateLimitStats(): {
    totalKeys: number;
    activeKeys: number;
    topKeys: Array<{ key: string; count: number; resetTime: number }>;
  } {
    const now = Date.now();
    const activeEntries = Array.from(this.rateLimitStore.entries())
      .filter(([_, value]) => value.resetTime > now)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count);

    return {
      totalKeys: this.rateLimitStore.size,
      activeKeys: activeEntries.length,
      topKeys: activeEntries.slice(0, 10),
    };
  }

  /**
   * Limpar todos os rate limits (útil para testes)
   */
  public clearAllRateLimits(): void {
    this.rateLimitStore.clear();
    logger.info('🧹 Todos os rate limits foram limpos');
  }

  /**
   * Remover rate limit específico
   */
  public clearRateLimit(key: string): boolean {
    const deleted = this.rateLimitStore.delete(key);
    if (deleted) {
      logger.info('🧹 Rate limit removido', { key });
    }
    return deleted;
  }
}

export const rateLimiter = RateLimiterConfig.getInstance();
export default rateLimiter;
