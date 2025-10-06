import { environment } from '@/config/environment.js';
import { logger } from '@/shared/utils/logger.js';
import Bottleneck from 'bottleneck';
import IORedis from 'ioredis';

/**
 * Serviço de Rate Limiting para a API da MiX Telematics
 *
 * Regras implementadas:
 * - HasMoreItems = TRUE: aguarda 3 segundos entre chamadas (20 req/min seguro)
 * - HasMoreItems = FALSE: aguarda 30 segundos (regra da API)
 * - Em caso de erro: backoff exponencial
 */
export class ApiRateLimiter {
  private limiter: Bottleneck;
  private lastRequestTime: number = 0;
  private consecutiveErrors: number = 0;

  constructor() {
    const limiterConfig: Bottleneck.ConstructorOptions = {
      minTime: 3000, // Mínimo 3 segundos entre requisições
      maxConcurrent: 1, // Apenas 1 requisição por vez
    };

    // Se Redis estiver habilitado, usa para controle distribuído
    if (environment.redis.enabled) {
      const redisClient = new IORedis({
        host: environment.redis.host,
        port: environment.redis.port,
        password: environment.redis.password,
        db: environment.redis.db,
        enableOfflineQueue: false,
      });

      const redisConnection = new Bottleneck.IORedisConnection({
        client: redisClient,
      });

      limiterConfig.connection = redisConnection;
      limiterConfig.id = 'mix-api-rate-limiter';

      logger.info('🔒 Rate Limiter configurado com Redis (modo distribuído)');
    } else {
      logger.info('🔒 Rate Limiter configurado em memória (modo standalone)');
    }

    this.limiter = new Bottleneck(limiterConfig);

    // Event listeners para monitoramento
    this.limiter.on('failed', async (error, jobInfo) => {
      logger.warn('⚠️ Rate limiter detectou falha na requisição', {
        error: error.message,
        retryCount: jobInfo.retryCount,
      });
    });

    this.limiter.on('retry', (_error, jobInfo) => {
      logger.info('🔄 Rate limiter: retry automático', {
        retryCount: jobInfo.retryCount,
        nextRetryIn: `${jobInfo.retryCount * 1000}ms`,
      });
    });
  }

  /**
   * Aguarda o tempo necessário antes da próxima requisição à API
   *
   * @param hasMoreItems - Se a última resposta indicou que há mais dados
   * @param hadError - Se a última tentativa resultou em erro
   */
  async waitBeforeNextRequest(hasMoreItems: boolean, hadError: boolean = false): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Determina o tempo mínimo de espera baseado nas regras da API
    let minimumWaitTime: number;

    if (hadError) {
      // Backoff exponencial em caso de erro
      this.consecutiveErrors++;
      minimumWaitTime = Math.min(
        Math.pow(2, this.consecutiveErrors) * 1000, // 1s, 2s, 4s, 8s, 16s...
        60000 // máximo 60 segundos
      );
      logger.warn(
        `⏳ Aguardando ${minimumWaitTime}ms após erro (tentativa ${this.consecutiveErrors})`
      );
    } else if (!hasMoreItems) {
      // Regra da API: aguardar 30 segundos quando não há mais itens
      minimumWaitTime = 30000;
      this.consecutiveErrors = 0; // reset contador de erros
      logger.info('⏳ Aguardando 30 segundos (hasMoreItems = false, regra da API)');
    } else {
      // HasMoreItems = true: aguarda 3 segundos (segurança para 20 req/min)
      minimumWaitTime = 3000;
      this.consecutiveErrors = 0; // reset contador de erros
      logger.debug('⏳ Aguardando 3 segundos (hasMoreItems = true)');
    }

    // Se já passou tempo suficiente desde a última requisição, não precisa esperar
    if (timeSinceLastRequest >= minimumWaitTime) {
      logger.debug(
        `✅ Tempo já transcorrido (${timeSinceLastRequest}ms), prosseguindo imediatamente`
      );
      this.lastRequestTime = now;
      return;
    }

    // Calcula quanto tempo ainda precisa esperar
    const remainingWaitTime = minimumWaitTime - timeSinceLastRequest;
    logger.debug(`⏰ Aguardando mais ${remainingWaitTime}ms antes da próxima requisição`);

    await this._sleep(remainingWaitTime);
    this.lastRequestTime = Date.now();
  }

  /**
   * Wrapper para executar uma função com rate limiting
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }

  /**
   * Reseta o contador de erros consecutivos (útil após sucesso)
   */
  resetErrorCount(): void {
    if (this.consecutiveErrors > 0) {
      logger.debug(`🔄 Resetando contador de erros (estava em ${this.consecutiveErrors})`);
      this.consecutiveErrors = 0;
    }
  }

  /**
   * Retorna estatísticas do rate limiter
   */
  getStats(): {
    consecutiveErrors: number;
    timeSinceLastRequest: number;
    counts: Bottleneck.Counts;
  } {
    return {
      consecutiveErrors: this.consecutiveErrors,
      timeSinceLastRequest: Date.now() - this.lastRequestTime,
      counts: this.limiter.counts(),
    };
  }

  /**
   * Helper para sleep
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fecha o rate limiter e limpa recursos
   */
  async disconnect(): Promise<void> {
    await this.limiter.disconnect();
    logger.info('🔌 Rate Limiter desconectado');
  }
}
