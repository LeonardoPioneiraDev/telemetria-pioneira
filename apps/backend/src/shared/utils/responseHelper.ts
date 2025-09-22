import { FastifyReply } from 'fastify';
import { logger } from './logger.js';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: string[];
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export class ResponseHelper {
  private static instance: ResponseHelper;

  private constructor() {}

  public static getInstance(): ResponseHelper {
    if (!ResponseHelper.instance) {
      ResponseHelper.instance = new ResponseHelper();
    }
    return ResponseHelper.instance;
  }

  /**
   * Resposta de sucesso
   */
  public success<T>(
    reply: FastifyReply,
    data?: T,
    message: string = 'Operação realizada com sucesso',
    statusCode: number = 200,
    meta?: any
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: reply.request.id,
        version: '1.0.0',
        ...meta
      }
    };

    reply.status(statusCode).send(response);
  }

  /**
   * Resposta de sucesso com paginação
   */
  public successWithPagination<T>(
    reply: FastifyReply,
    data: T[],
    pagination: PaginationOptions,
    message: string = 'Dados recuperados com sucesso',
    statusCode: number = 200
  ): void {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: reply.request.id,
        version: '1.0.0',
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages
        }
      }
    };

    reply.status(statusCode).send(response);
  }

  /**
   * Resposta de erro
   */
  public error(
    reply: FastifyReply,
    message: string = 'Erro interno do servidor',
    statusCode: number = 500,
    error?: string,
    errors?: string[]
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error,
      errors,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: reply.request.id,
        version: '1.0.0'
      }
    };

    // Log do erro
    logger.error('Resposta de erro enviada:', {
      statusCode,
      message,
      error,
      errors,
      requestId: reply.request.id,
      url: reply.request.url,
      method: reply.request.method
    });

    reply.status(statusCode).send(response);
  }

  /**
   * Erro de validação
   */
  public validationError(
    reply: FastifyReply,
    errors: string[],
    message: string = 'Dados de entrada inválidos'
  ): void {
    this.error(reply, message, 400, undefined, errors);
  }

  /**
   * Erro de autenticação
   */
  public authenticationError(
    reply: FastifyReply,
    message: string = 'Token de autenticação inválido ou expirado'
  ): void {
    this.error(reply, message, 401, 'AUTHENTICATION_FAILED');
  }

  /**
   * Erro de autorização
   */
  public authorizationError(
    reply: FastifyReply,
    message: string = 'Acesso negado. Permissões insuficientes'
  ): void {
    this.error(reply, message, 403, 'AUTHORIZATION_FAILED');
  }

  /**
   * Erro de não encontrado
   */
  public notFoundError(
    reply: FastifyReply,
    message: string = 'Recurso não encontrado'
  ): void {
    this.error(reply, message, 404, 'RESOURCE_NOT_FOUND');
  }

  /**
   * Erro de conflito
   */
  public conflictError(
    reply: FastifyReply,
    message: string = 'Conflito com o estado atual do recurso'
  ): void {
    this.error(reply, message, 409, 'RESOURCE_CONFLICT');
  }

  /**
   * Erro de rate limit
   */
  public rateLimitError(
    reply: FastifyReply,
    message: string = 'Muitas tentativas. Tente novamente mais tarde'
  ): void {
    this.error(reply, message, 429, 'RATE_LIMIT_EXCEEDED');
  }

  /**
   * Erro de servidor
   */
  public serverError(
    reply: FastifyReply,
    message: string = 'Erro interno do servidor',
    error?: any
  ): void {
    // Log detalhado do erro
    logger.error('Erro interno do servidor:', {
      message,
      error: error?.message || error,
      stack: error?.stack,
      requestId: reply.request.id,
      url: reply.request.url,
      method: reply.request.method
    });

    this.error(reply, message, 500, 'INTERNAL_SERVER_ERROR');
  }

  /**
   * Resposta de criação bem-sucedida
   */
  public created<T>(
    reply: FastifyReply,
    data: T,
    message: string = 'Recurso criado com sucesso'
  ): void {
    this.success(reply, data, message, 201);
  }

  /**
   * Resposta de atualização bem-sucedida
   */
  public updated<T>(
    reply: FastifyReply,
    data?: T,
    message: string = 'Recurso atualizado com sucesso'
  ): void {
    this.success(reply, data, message, 200);
  }

  /**
   * Resposta de exclusão bem-sucedida
   */
  public deleted(
    reply: FastifyReply,
    message: string = 'Recurso excluído com sucesso'
  ): void {
    this.success(reply, null, message, 200);
  }

  /**
   * Resposta sem conteúdo
   */
  public noContent(reply: FastifyReply): void {
    reply.status(204).send();
  }

  /**
   * Resposta de login bem-sucedido
   */
  public loginSuccess(
    reply: FastifyReply,
    data: {
      user: any;
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
    },
    message: string = 'Login realizado com sucesso'
  ): void {
    this.success(reply, data, message, 200);
  }

  /**
   * Resposta de logout bem-sucedido
   */
  public logoutSuccess(
    reply: FastifyReply,
    message: string = 'Logout realizado com sucesso'
  ): void {
    this.success(reply, null, message, 200);
  }

  /**
   * Resposta de token renovado
   */
  public tokenRefreshed(
    reply: FastifyReply,
    data: {
      accessToken: string;
      expiresIn: string;
    },
    message: string = 'Token renovado com sucesso'
  ): void {
    this.success(reply, data, message, 200);
  }

  /**
   * Resposta de email enviado
   */
  public emailSent(
    reply: FastifyReply,
    message: string = 'Email enviado com sucesso'
  ): void {
    this.success(reply, null, message, 200);
  }

  /**
   * Resposta de senha alterada
   */
  public passwordChanged(
    reply: FastifyReply,
    message: string = 'Senha alterada com sucesso'
  ): void {
    this.success(reply, null, message, 200);
  }

  /**
   * Resposta de health check
   */
  public healthCheck(
    reply: FastifyReply,
    data: {
      status: 'healthy' | 'unhealthy';
      timestamp: string;
      uptime: number;
      services: Record<string, any>;
    }
  ): void {
    const statusCode = data.status === 'healthy' ? 200 : 503;
    this.success(reply, data, `Sistema ${data.status === 'healthy' ? 'saudável' : 'com problemas'}`, statusCode);
  }

  /**
   * Tratar erros do Joi
   */
  public handleJoiError(reply: FastifyReply, error: any): void {
    if (error.isJoi) {
      const errors = error.details.map((detail: any) => detail.message);
      this.validationError(reply, errors, 'Dados de entrada inválidos');
      return;
    }

    this.serverError(reply, 'Erro na validação dos dados', error);
  }

  /**
   * Tratar erros de banco de dados
   */
  public handleDatabaseError(reply: FastifyReply, error: any): void {
    // Erro de violação de chave única
    if (error.code === '23505') {
      this.conflictError(reply, 'Recurso já existe');
      return;
    }

    // Erro de violação de chave estrangeira
    if (error.code === '23503') {
      this.error(reply, 'Referência inválida', 400, 'FOREIGN_KEY_VIOLATION');
      return;
    }

    // Erro de violação de not null
    if (error.code === '23502') {
      this.error(reply, 'Campo obrigatório não informado', 400, 'NOT_NULL_VIOLATION');
      return;
    }

    // Erro de conexão
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.serverError(reply, 'Erro de conexão com o banco de dados');
      return;
    }

    this.serverError(reply, 'Erro no banco de dados', error);
  }
}

export const responseHelper = ResponseHelper.getInstance();
export default responseHelper;