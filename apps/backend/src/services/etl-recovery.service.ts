import { environment } from '@/config/environment.js';
import { logger } from '@/shared/utils/logger.js';

interface FailedToken {
  token: string;
  attempts: number;
  lastError: string;
  timestamp: Date;
}

/**
 * Serviço de Recuperação de Falhas do ETL
 *
 * Responsável por:
 * - Gerenciar retries com backoff exponencial
 * - Implementar circuit breaker simples
 * - Registrar tokens problemáticos para análise
 */
export class EtlRecoveryService {
  private failedTokens: Map<string, FailedToken> = new Map();
  private consecutiveFailures: number = 0;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerOpenedAt: number = 0;

  // Configurações
  private readonly MAX_CONSECUTIVE_FAILURES = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 120000; // 2 minutos
  private readonly MAX_RETRY_ATTEMPTS = environment.api.retryAttempts;
  private readonly BASE_RETRY_DELAY = environment.api.retryDelay;

  /**
   * Aguarda com backoff exponencial antes de tentar novamente
   *
   * @param attemptNumber - Número da tentativa (1, 2, 3...)
   */
  async waitWithBackoff(attemptNumber: number): Promise<void> {
    // Backoff exponencial: 1s, 2s, 4s, 8s...
    const delay = this.BASE_RETRY_DELAY * Math.pow(2, attemptNumber - 1);
    const maxDelay = 30000; // máximo 30 segundos
    const finalDelay = Math.min(delay, maxDelay);

    logger.info(
      `⏳ Aguardando ${finalDelay}ms antes da tentativa ${attemptNumber + 1} (backoff exponencial)`
    );
    await this._sleep(finalDelay);
  }

  /**
   * Registra uma falha de token e verifica se deve abrir o circuit breaker
   *
   * @param token - Token que falhou
   * @param error - Erro ocorrido
   */
  async recordFailedToken(token: string, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Atualiza registro do token
    const existing = this.failedTokens.get(token);
    if (existing) {
      existing.attempts++;
      existing.lastError = errorMessage;
      existing.timestamp = new Date();
    } else {
      this.failedTokens.set(token, {
        token,
        attempts: 1,
        lastError: errorMessage,
        timestamp: new Date(),
      });
    }

    // Incrementa contador de falhas consecutivas
    this.consecutiveFailures++;

    logger.error(`❌ Token ${token} falhou após ${this.MAX_RETRY_ATTEMPTS} tentativas`, {
      error: errorMessage,
      consecutiveFailures: this.consecutiveFailures,
      totalFailedTokens: this.failedTokens.size,
    });

    // Verifica se deve abrir o circuit breaker
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      await this._openCircuitBreaker();
    }
  }

  /**
   * Registra um sucesso (reseta contadores)
   */
  recordSuccess(): void {
    if (this.consecutiveFailures > 0) {
      logger.info(
        `✅ Sucesso após ${this.consecutiveFailures} falhas consecutivas. Resetando contadores.`
      );
      this.consecutiveFailures = 0;
    }

    // Fecha o circuit breaker se estava aberto
    if (this.circuitBreakerOpen) {
      this._closeCircuitBreaker();
    }
  }

  /**
   * Verifica se o circuit breaker está aberto e aguarda se necessário
   *
   * @returns true se pode prosseguir, false se deve aguardar
   */
  async checkCircuitBreaker(): Promise<boolean> {
    if (!this.circuitBreakerOpen) {
      return true;
    }

    const timeSinceOpened = Date.now() - this.circuitBreakerOpenedAt;

    if (timeSinceOpened >= this.CIRCUIT_BREAKER_TIMEOUT) {
      // Timeout expirou, fecha o circuit breaker e tenta novamente
      this._closeCircuitBreaker();
      logger.info('🔄 Circuit breaker: timeout expirou, tentando novamente...');
      return true;
    }

    // Ainda dentro do timeout
    const remainingTime = this.CIRCUIT_BREAKER_TIMEOUT - timeSinceOpened;
    logger.warn(
      `🚫 Circuit breaker ABERTO. Aguardando ${Math.round(remainingTime / 1000)}s antes de tentar novamente...`
    );
    await this._sleep(remainingTime);

    this._closeCircuitBreaker();
    return true;
  }

  /**
   * Gera um token "próximo" baseado no token atual.
   * Se o token estiver expirado (> 6 dias), retorna 'NEW' para reiniciar.
   * Caso contrário, incrementa 1 segundo.
   */
  generateNextToken(currentToken: string): string {
    // Se for 'NEW', não podemos avançar
    if (currentToken === 'NEW') {
      logger.warn('⚠️ Token atual é "NEW", não é possível avançar. Mantendo o mesmo token.');
      return currentToken;
    }

    try {
      // O token da MiX é um timestamp no formato: YYYYMMDDHHMMSSMMM
      // Exemplo: 20251001184137000
      const year = parseInt(currentToken.substring(0, 4));
      const month = parseInt(currentToken.substring(4, 6)) - 1; // JS months são 0-indexed
      const day = parseInt(currentToken.substring(6, 8));
      const hour = parseInt(currentToken.substring(8, 10));
      const minute = parseInt(currentToken.substring(10, 12));
      const second = parseInt(currentToken.substring(12, 14));
      const ms = parseInt(currentToken.substring(14, 17));

      const tokenDate = new Date(year, month, day, hour, minute, second, ms);
      const now = new Date();
      const diffDays = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60 * 24);

      // Se o token tem mais de 6 dias (limite da API é 7), reseta para 'NEW'
      if (diffDays > 6) {
        logger.warn(
          `⚠️ Token ${currentToken} expirado (${diffDays.toFixed(1)} dias). Resetando para 'NEW' para buscar eventos recentes.`
        );
        return 'NEW';
      }

      // Token ainda válido, incrementa 1 segundo
      tokenDate.setSeconds(tokenDate.getSeconds() + 1);

      // Formata de volta para o padrão da MiX
      const nextToken =
        tokenDate.getFullYear().toString() +
        (tokenDate.getMonth() + 1).toString().padStart(2, '0') +
        tokenDate.getDate().toString().padStart(2, '0') +
        tokenDate.getHours().toString().padStart(2, '0') +
        tokenDate.getMinutes().toString().padStart(2, '0') +
        tokenDate.getSeconds().toString().padStart(2, '0') +
        tokenDate.getMilliseconds().toString().padStart(3, '0');

      logger.info(`⏭️ Token avançado: ${currentToken} → ${nextToken}`);
      return nextToken;
    } catch (error) {
      logger.error('❌ Erro ao gerar próximo token, resetando para NEW', { error, currentToken });
      return 'NEW';
    }
  }

  /**
   * Retorna estatísticas de recuperação
   */
  getStats(): {
    failedTokensCount: number;
    consecutiveFailures: number;
    circuitBreakerOpen: boolean;
    failedTokensList: FailedToken[];
  } {
    return {
      failedTokensCount: this.failedTokens.size,
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerOpen: this.circuitBreakerOpen,
      failedTokensList: Array.from(this.failedTokens.values()),
    };
  }

  /**
   * Limpa os registros de tokens falhados (útil para testes ou reset manual)
   */
  clearFailedTokens(): void {
    const count = this.failedTokens.size;
    this.failedTokens.clear();
    logger.info(`🧹 ${count} tokens falhados foram limpos do registro`);
  }

  // ==================== Métodos Privados ====================

  private async _openCircuitBreaker(): Promise<void> {
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenedAt = Date.now();

    logger.error(
      `🚨 CIRCUIT BREAKER ABERTO! ` +
        `${this.consecutiveFailures} falhas consecutivas detectadas. ` +
        `Pausando ETL por ${this.CIRCUIT_BREAKER_TIMEOUT / 1000} segundos...`,
      {
        failedTokens: Array.from(this.failedTokens.keys()),
        totalFailures: this.consecutiveFailures,
      }
    );

    // Aguarda o timeout do circuit breaker
    await this._sleep(this.CIRCUIT_BREAKER_TIMEOUT);
  }

  private _closeCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      logger.info('✅ Circuit breaker FECHADO. Retomando operação normal.');
      this.circuitBreakerOpen = false;
      this.circuitBreakerOpenedAt = 0;
      this.consecutiveFailures = 0;
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
