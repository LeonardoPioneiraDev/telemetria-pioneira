import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService } from '../../../shared/utils/jwt.js';
import { responseHelper } from '../../../shared/utils/responseHelper.js';
import { logger, securityLogger } from '../../../shared/utils/logger.js';
import { USER_PERMISSIONS, ROLE_PERMISSIONS } from '../../../shared/constants/index.js';
import type { UserPermission, UserRole } from '../../../shared/constants/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: UserPermission[];
}

export class AuthMiddleware {
  private static instance: AuthMiddleware;

  private constructor() {}

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  /**
   * Middleware de autenticação obrigatória
   */
  public authenticate() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = this.extractToken(request);
        
        if (!token) {
          securityLogger.warn('Tentativa de acesso sem token', {
            ip: request.ip,
            url: request.url,
            method: request.method,
            userAgent: request.headers['user-agent']
          });
          
          return responseHelper.authenticationError(reply, 'Token de autenticação não fornecido');
        }

        const payload = jwtService.verifyAccessToken(token);
        
        // Adicionar usuário ao request
        request.user = {
          id: payload.id,
          email: payload.email,
          username: payload.username,
          role: payload.role as UserRole,
          permissions: payload.permissions as UserPermission[]
        };

        securityLogger.info('Usuário autenticado com sucesso', {
          userId: payload.id,
          email: payload.email,
          role: payload.role,
          ip: request.ip,
          url: request.url,
          method: request.method
        });

      } catch (error) {
        securityLogger.warn('Falha na autenticação', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          ip: request.ip,
          url: request.url,
          method: request.method,
          userAgent: request.headers['user-agent']
        });

        if (error instanceof Error) {
          if (error.message === 'Token expirado') {
            return responseHelper.authenticationError(reply, 'Token expirado. Faça login novamente');
          }
          
          if (error.message === 'Token inválido') {
            return responseHelper.authenticationError(reply, 'Token inválido');
          }
        }

        return responseHelper.authenticationError(reply, 'Falha na autenticação');
      }
    };
  }

  /**
   * Middleware de autenticação opcional
   */
  public optionalAuthenticate() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = this.extractToken(request);
        
        if (token) {
          const payload = jwtService.verifyAccessToken(token);
          
          request.user = {
            id: payload.id,
            email: payload.email,
            username: payload.username,
            role: payload.role as UserRole,
            permissions: payload.permissions as UserPermission[]
          };
        }
      } catch (error) {
        // Em autenticação opcional, ignorar erros de token
        logger.debug('Token opcional inválido ignorado', {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    };
  }

  /**
   * Middleware de autorização por permissão
   */
  public requirePermission(permission: UserPermission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return responseHelper.authenticationError(reply, 'Autenticação necessária');
      }

      if (!this.hasPermission(request.user, permission)) {
        securityLogger.warn('Acesso negado por falta de permissão', {
          userId: request.user.id,
          email: request.user.email,
          role: request.user.role,
          requiredPermission: permission,
          userPermissions: request.user.permissions,
          ip: request.ip,
          url: request.url,
          method: request.method
        });

        return responseHelper.authorizationError(reply, `Permissão necessária: ${permission}`);
      }

      securityLogger.info('Acesso autorizado', {
        userId: request.user.id,
        permission,
        url: request.url,
        method: request.method
      });
    };
  }

  /**
   * Middleware de autorização por role
   */
  public requireRole(role: UserRole) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return responseHelper.authenticationError(reply, 'Autenticação necessária');
      }

      if (!this.hasRole(request.user, role)) {
        securityLogger.warn('Acesso negado por falta de role', {
          userId: request.user.id,
          email: request.user.email,
          userRole: request.user.role,
          requiredRole: role,
          ip: request.ip,
          url: request.url,
          method: request.method
        });

        return responseHelper.authorizationError(reply, `Role necessária: ${role}`);
      }

      securityLogger.info('Acesso autorizado por role', {
        userId: request.user.id,
        role,
        url: request.url,
        method: request.method
      });
    };
  }

  /**
   * Middleware para verificar se é o próprio usuário ou admin
   */
  public requireOwnershipOrAdmin(userIdParam: string = 'id') {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return responseHelper.authenticationError(reply, 'Autenticação necessária');
      }

      const targetUserId = (request.params as any)[userIdParam];
      const isOwner = request.user.id === targetUserId;
      const isAdmin = this.hasRole(request.user, 'admin');

      if (!isOwner && !isAdmin) {
        securityLogger.warn('Acesso negado - não é proprietário nem admin', {
          userId: request.user.id,
          targetUserId,
          role: request.user.role,
          ip: request.ip,
          url: request.url,
          method: request.method
        });

        return responseHelper.authorizationError(reply, 'Acesso negado. Você só pode acessar seus próprios dados');
      }

      securityLogger.info('Acesso autorizado por propriedade/admin', {
        userId: request.user.id,
        targetUserId,
        isOwner,
        isAdmin,
        url: request.url,
        method: request.method
      });
    };
  }

  /**
   * Extrair token do header Authorization
   */
  private extractToken(request: FastifyRequest): string | null {
    const authorization = request.headers.authorization;
    
    if (!authorization) {
      return null;
    }

    if (!authorization.startsWith('Bearer ')) {
      return null;
    }

    return authorization.substring(7);
  }

  /**
   * Verificar se usuário tem permissão específica
   */
  private hasPermission(user: AuthenticatedUser, permission: UserPermission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Verificar se usuário tem role específica
   */
  private hasRole(user: AuthenticatedUser, role: UserRole): boolean {
    return user.role === role;
  }

  /**
   * Verificar se usuário tem qualquer uma das permissões
   */
  public hasAnyPermission(user: AuthenticatedUser, permissions: UserPermission[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Verificar se usuário tem todas as permissões
   */
  public hasAllPermissions(user: AuthenticatedUser, permissions: UserPermission[]): boolean {
    return permissions.every(permission => user.permissions.includes(permission));
  }

  /**
   * Middleware combinado: autenticação + permissão
   */
  public requireAuth(permission?: UserPermission, role?: UserRole) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Primeiro, autenticar
      await this.authenticate()(request, reply);
      
      if (reply.sent) return;

      // Depois, verificar permissão se especificada
      if (permission) {
        await this.requirePermission(permission)(request, reply);
        if (reply.sent) return;
      }

      // Por último, verificar role se especificada
      if (role) {
        await this.requireRole(role)(request, reply);
      }
    };
  }
}

export const authMiddleware = AuthMiddleware.getInstance();
export default authMiddleware;