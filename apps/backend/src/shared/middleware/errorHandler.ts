import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { environment } from '../../config/environment.js';
import { logger } from '../utils/logger.js';
import { responseHelper } from '../utils/responseHelper.js';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  validation?: any[];
  isOperational?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handler principal de erros
   */
  public async handleError(
    error: FastifyError | CustomError,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Log do erro
    this.logError(error, request);

    // Determinar se é um erro operacional ou crítico
    const isOperationalError = this.isOperationalError(error);

    if (!isOperationalError) {
      // Para erros críticos, notificar administradores (implementar se necessário)
      this.notifyCriticalError(error, request);
    }

    // Enviar resposta apropriada
    this.sendErrorResponse(error, reply);
  }

  /**
   * Verificar se é um erro operacional (esperado)
   */
  private isOperationalError(error: FastifyError | CustomError): boolean {
    if ('isOperational' in error && error.isOperational) {
      return true;
    }

    // Erros do Fastify que são operacionais
    const operationalCodes = [
      'FST_ERR_VALIDATION',
      'FST_ERR_BAD_STATUS_CODE',
      'FST_ERR_INVALID_URL',
      'FST_ERR_ROUTE_NOT_FOUND',
    ];

    return operationalCodes.includes(error.code || '');
  }

  /**
   * Log do erro
   */
  private logError(error: FastifyError | CustomError, request: FastifyRequest): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: 'statusCode' in error ? error.statusCode : 500,
      url: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      requestId: request.id,
      userId: (request.user as any)?.id,
      timestamp: new Date().toISOString(),
    };

    if (this.isOperationalError(error)) {
      logger.warn('Erro operacional:', errorInfo);
    } else {
      logger.error('Erro crítico:', errorInfo);
    }
  }

  /**
   * Notificar erro crítico
   */
  private notifyCriticalError(error: FastifyError | CustomError, request: FastifyRequest): void {
    // Implementar notificação para administradores
    // Pode ser email, Slack, Discord, etc.
    logger.error('🚨 ERRO CRÍTICO DETECTADO - Notificação necessária:', {
      error: error.message,
      url: request.url,
      method: request.method,
      userId: (request.user as any)?.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Enviar resposta de erro
   */
  private sendErrorResponse(error: FastifyError | CustomError, reply: FastifyReply): void {
    // Se a resposta já foi enviada, não fazer nada
    if (reply.sent) {
      return;
    }

    const statusCode = this.getStatusCode(error);
    const message = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);

    // Em produção, não expor detalhes internos
    const errorDetails = environment.NODE_ENV === 'development' ? error.message : undefined;

    switch (statusCode) {
      case 400:
        if ('validation' in error && error.validation) {
          const validationErrors = error.validation.map((v: any) => v.message);
          responseHelper.validationError(reply, validationErrors, message);
        } else {
          responseHelper.error(reply, message, statusCode, errorCode);
        }
        break;

      case 401:
        responseHelper.authenticationError(reply, message);
        break;

      case 403:
        responseHelper.authorizationError(reply, message);
        break;

      case 404:
        responseHelper.notFoundError(reply, message);
        break;

      case 409:
        responseHelper.conflictError(reply, message);
        break;

      case 429:
        responseHelper.rateLimitError(reply, message);
        break;

      default:
        responseHelper.serverError(reply, message, errorDetails);
    }
  }

  /**
   * Obter status code do erro
   */
  private getStatusCode(error: FastifyError | CustomError): number {
    if ('statusCode' in error && error.statusCode) {
      return error.statusCode;
    }

    // Mapear códigos específicos do Fastify
    switch (error.code) {
      case 'FST_ERR_VALIDATION':
        return 400;
      case 'FST_ERR_NOT_FOUND':
      case 'FST_ERR_ROUTE_NOT_FOUND':
        return 404;
      case 'FST_ERR_BAD_STATUS_CODE':
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Obter mensagem de erro apropriada
   */
  private getErrorMessage(error: FastifyError | CustomError): string {
    // Em produção, usar mensagens genéricas para alguns erros
    if (environment.NODE_ENV === 'production') {
      const statusCode = this.getStatusCode(error);

      switch (statusCode) {
        case 400:
          return 'Dados de entrada inválidos';
        case 401:
          return 'Autenticação necessária';
        case 403:
          return 'Acesso negado';
        case 404:
          return 'Recurso não encontrado';
        case 409:
          return 'Conflito com o estado atual do recurso';
        case 429:
          return 'Muitas tentativas. Tente novamente mais tarde';
        case 500:
        default:
          return 'Erro interno do servidor';
      }
    }

    return error.message || 'Erro desconhecido';
  }

  /**
   * Obter código de erro
   */
  private getErrorCode(error: FastifyError | CustomError): string | undefined {
    if (error.code) {
      return error.code;
    }

    const statusCode = this.getStatusCode(error);

    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 500:
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  /**
   * Criar erro personalizado
   */
  public createError(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ): CustomError {
    const error = new Error(message) as CustomError;
    error.statusCode = statusCode;
    if (code) {
      (error as any).code = code;
    }
    error.isOperational = isOperational;
    return error;
  }

  /**
   * Middleware para capturar erros não tratados
   */
  public getErrorMiddleware() {
    return async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      await this.handleError(error, request, reply);
    };
  }
}

export const errorHandler = ErrorHandler.getInstance();

// Plugin para registrar o handler de erro no Fastify
export const errorHandlerPlugin = async (fastify: any) => {
  fastify.setErrorHandler(errorHandler.getErrorMiddleware());
};

export default errorHandler;
