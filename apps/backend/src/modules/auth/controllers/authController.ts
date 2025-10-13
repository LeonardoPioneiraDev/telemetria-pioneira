//apps/backend/src/modules/auth/controllers/authController.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole, UserStatus } from '../../../shared/constants/index.js';
import { USER_ROLES } from '../../../shared/constants/index.js';
import { authLogger, logger } from '../../../shared/utils/logger.js';
import { userModel } from '../models/User.js';
import { authService } from '../services/authService.js';
import { UserEntity } from '@/entities/user.entity.js';

export interface RegisterBody {
  email: string;
  username: string;
  fullName: string;
  password: string;
  acceptTerms: boolean;
}

export interface LoginBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface PasswordResetRequestBody {
  email: string;
}

export interface PasswordResetBody {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileBody {
  fullName?: string;
  username?: string;
  email?: string;
}

export interface CreateUserBody {
  email: string;
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserBody {
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AuthController {
  private static instance: AuthController;

  private constructor() {}

  public static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  /**
   * Registrar novo usuário
   */
  public async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { email, username, fullName, password, acceptTerms } = request.body as RegisterBody;

      authLogger.info('Tentativa de registro', { email, username });

      const result = await authService.register({
        email,
        username,
        fullName,
        password,
        acceptTerms,
      });

      return reply.status(201).send({
        success: true,
        message: result.message,
        data: result.user,
      });
    } catch (error) {
      authLogger.error('Erro no registro:', error);

      if (error instanceof Error) {
        if (error.message.includes('já está em uso') || error.message.includes('já existe')) {
          return reply.status(409).send({
            success: false,
            message: error.message,
            error: 'CONFLICT',
          });
        }

        if (error.message.includes('não atende aos critérios')) {
          return reply.status(400).send({
            success: false,
            message: 'Dados inválidos',
            errors: [error.message],
            error: 'VALIDATION_ERROR',
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno no registro',
      });
    }
  }

  /**
   * Fazer login
   */
  public async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { email, password, rememberMe } = request.body as LoginBody;
      const ipAddress = request.ip;

      authLogger.info('Tentativa de login', { email, ip: ipAddress });

      const result = await authService.login(
        {
          email,
          password,
          rememberMe: rememberMe ?? false,
        },
        ipAddress
      );

      return reply.status(200).send({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      authLogger.error('Erro no login:', error);

      if (error instanceof Error) {
        if (error.message.includes('Credenciais inválidas')) {
          return reply.status(401).send({
            success: false,
            message: 'Email ou senha incorretos',
            error: 'AUTHENTICATION_ERROR',
          });
        }

        if (error.message.includes('bloqueada')) {
          return reply.status(423).send({
            success: false,
            message: error.message,
            error: 'ACCOUNT_LOCKED',
          });
        }

        if (error.message.includes('inativa') || error.message.includes('suspensa')) {
          return reply.status(403).send({
            success: false,
            message: error.message,
            error: 'ACCOUNT_DISABLED',
          });
        }

        if (error.message.includes('pendente')) {
          return reply.status(403).send({
            success: false,
            message: error.message,
            error: 'ACCOUNT_PENDING',
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno no login',
      });
    }
  }

  /**
   * Renovar token de acesso
   */
  public async refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { refreshToken } = request.body as RefreshTokenBody;

      authLogger.info('Tentativa de renovação de token');

      const result = await authService.refreshToken(refreshToken);

      return reply.status(200).send({
        success: true,
        message: 'Token renovado com sucesso',
        data: result,
      });
    } catch (error) {
      authLogger.error('Erro na renovação de token:', error);

      if (error instanceof Error) {
        if (error.message.includes('expirado') || error.message.includes('inválido')) {
          return reply.status(401).send({
            success: false,
            message: 'Token de refresh inválido ou expirado',
            error: 'AUTHENTICATION_ERROR',
          });
        }

        if (error.message.includes('não encontrado')) {
          return reply.status(404).send({
            success: false,
            message: 'Usuário não encontrado',
            error: 'NOT_FOUND',
          });
        }

        if (error.message.includes('inativo')) {
          return reply.status(403).send({
            success: false,
            message: 'Usuário inativo',
            error: 'USER_INACTIVE',
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno na renovação do token',
      });
    }
  }

  /**
   * Solicitar reset de senha
   */
  public async requestPasswordReset(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { email } = request.body as PasswordResetRequestBody;

      authLogger.info('Solicitação de reset de senha', { email });

      const result = await authService.requestPasswordReset({ email });

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      authLogger.error('Erro na solicitação de reset de senha:', error);

      if (error instanceof Error && error.message.includes('Falha ao enviar email')) {
        return reply.status(500).send({
          success: false,
          message: 'Falha ao enviar email de recuperação',
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno na solicitação de reset',
      });
    }
  }

  /**
   * Resetar senha
   */
  public async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { token, newPassword } = request.body as PasswordResetBody;

      authLogger.info('Tentativa de reset de senha');

      const result = await authService.resetPassword({ token, newPassword });

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      authLogger.error('Erro no reset de senha:', error);

      if (error instanceof Error) {
        if (error.message.includes('inválido') || error.message.includes('expirado')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            error: 'INVALID_RESET_TOKEN',
          });
        }

        if (error.message.includes('não atende aos critérios')) {
          return reply.status(400).send({
            success: false,
            message: 'Dados inválidos',
            errors: [error.message],
            error: 'VALIDATION_ERROR',
          });
        }

        if (error.message.includes('deve ser diferente')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            error: 'SAME_PASSWORD',
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno no reset de senha',
      });
    }
  }

  /**
   * Alterar senha (usuário logado)
   */
  public async changePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { currentPassword, newPassword } = request.body as ChangePasswordBody;
      const userId = (request.user as { id: string }).id;

      authLogger.info('Tentativa de alteração de senha', { userId });

      const result = await authService.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      authLogger.error('Erro na alteração de senha:', error);

      if (error instanceof Error) {
        if (error.message.includes('incorreta')) {
          return reply.status(400).send({
            success: false,
            message: 'Senha atual incorreta',
            error: 'INVALID_CURRENT_PASSWORD',
          });
        }

        if (error.message.includes('não atende aos critérios')) {
          return reply.status(400).send({
            success: false,
            message: 'Dados inválidos',
            errors: [error.message],
            error: 'VALIDATION_ERROR',
          });
        }

        if (error.message.includes('deve ser diferente')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            error: 'SAME_PASSWORD',
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno na alteração de senha',
      });
    }
  }

  /**
   * Logout
   */
  public async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request.user as { id: string }).id;

      authLogger.info('Tentativa de logout', { userId });

      const result = await authService.logout(userId);

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      authLogger.error('Erro no logout:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno no logout',
      });
    }
  }

  /**
   * Obter perfil do usuário logado
   */
  public async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request.user as { id: string }).id;
      const profile = await authService.getProfile(userId);

      return reply.status(200).send({
        success: true,
        message: 'Perfil recuperado com sucesso',
        data: profile,
      });
    } catch (error) {
      logger.error('Erro ao obter perfil:', error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.status(404).send({
          success: false,
          message: 'Usuário não encontrado',
          error: 'NOT_FOUND',
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao obter perfil',
      });
    }
  }

  /**
   * Atualizar perfil do usuário logado
   */
  public async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request.user as { id: string }).id;
      const updateData = request.body as UpdateProfileBody;

      authLogger.info('Atualizando perfil', { userId, fields: Object.keys(updateData) });

      const updatedProfile = await authService.updateProfile(userId, updateData);

      return reply.status(200).send({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedProfile,
      });
    } catch (error) {
      authLogger.error('Erro ao atualizar perfil:', error);

      if (error instanceof Error) {
        if (error.message.includes('já está em uso')) {
          return reply.status(409).send({
            success: false,
            message: error.message,
            error: 'CONFLICT',
          });
        }

        if (error.message.includes('não encontrado')) {
          return reply.status(404).send({
            success: false,
            message: 'Usuário não encontrado',
            error: 'NOT_FOUND',
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao atualizar perfil',
      });
    }
  }

  /**
   * Verificar se email existe
   */
  public async checkEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { email } = request.query as { email: string };

      const result = await authService.checkEmailExists(email);

      return reply.status(200).send({
        success: true,
        message: 'Verificação realizada',
        data: result,
      });
    } catch (error) {
      logger.error('Erro ao verificar email:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno na verificação',
      });
    }
  }

  /**
   * Verificar se username existe
   */
  public async checkUsername(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { username } = request.query as { username: string };

      const result = await authService.checkUsernameExists(username);

      return reply.status(200).send({
        success: true,
        message: 'Verificação realizada',
        data: result,
      });
    } catch (error) {
      logger.error('Erro ao verificar username:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno na verificação',
      });
    }
  }

  /**
   * Listar usuários (Admin)
   */
  public async listUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        status,
        sortBy: rawSortBy = 'createdAt', // Renomeamos para rawSortBy
        sortOrder = 'desc',
      } = request.query as ListUsersQuery;

      // 👇 INÍCIO DA CORREÇÃO
      // 1. Criamos uma lista de campos permitidos para ordenação
      const allowedSortByFields: (keyof UserEntity)[] = [
        'id',
        'email',
        'username',
        'fullName',
        'role',
        'status',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
      ];

      // 2. Validamos o campo recebido. Se for inválido, usamos um padrão seguro.
      let sortBy: keyof UserEntity = 'createdAt';
      if (allowedSortByFields.includes(rawSortBy as keyof UserEntity)) {
        sortBy = rawSortBy as keyof UserEntity;
      }

      const filters: { search?: string; role?: UserRole; status?: UserStatus } = {};
      if (search) filters.search = search;
      if (role) filters.role = role;
      if (status) filters.status = status;

      const options = {
        page,
        limit,
        sortBy,
        sortOrder,
        filters,
      };

      const result = await userModel.list(options);

      const sanitizedUsers = result.users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        tokenVersion: user.tokenVersion,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return reply.status(200).send({
        success: true,
        message: 'Usuários recuperados com sucesso',
        data: sanitizedUsers,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao listar usuários',
      });
    }
  }

  /**
   * Obter usuário por ID (Admin)
   */
  public async getUserById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const user = await userModel.findById(id);

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'Usuário não encontrado',
          error: 'NOT_FOUND',
        });
      }

      const { password, ...sanitizedUser } = user;

      return reply.status(200).send({
        success: true,
        message: 'Usuário recuperado com sucesso',
        data: sanitizedUser,
      });
    } catch (error) {
      logger.error('Erro ao obter usuário por ID:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao obter usuário',
      });
    }
  }

  /**
   * Criar usuário (Admin)
   */
  public async createUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const adminId = (request.user as { id: string }).id;
      const userData = request.body as CreateUserBody;

      authLogger.info('Admin criando usuário', { adminId, email: userData.email });

      const result = await authService.createUserByAdmin({
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        password: userData.password,
        role: userData.role || USER_ROLES.USER,
        status: userData.status || 'active',
        sendWelcomeEmail: userData.sendWelcomeEmail ?? true,
      });

      const responseData = {
        user: result.user,
        temporaryPassword: result.temporaryPassword,
      };

      return reply.status(201).send({
        success: true,
        message: 'Usuário criado com sucesso',
        data: responseData,
      });
    } catch (error) {
      authLogger.error('Erro ao criar usuário:', error);
      if (error instanceof Error) {
        if (error.message.includes('já está em uso')) {
          return reply.status(409).send({
            success: false,
            message: error.message,
            error: 'CONFLICT',
          });
        }
      }
      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao criar usuário',
      });
    }
  }

  /**
   * Admin força a redefinição de senha de um usuário.
   */
  public async resetPasswordByAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id: targetUserId } = request.params as { id: string };
      const adminId = (request.user as { id: string }).id;

      if (targetUserId === adminId) {
        return reply.status(400).send({
          success: false,
          message:
            'Você não pode resetar sua própria senha através desta função. Use a opção "Esqueci minha senha".',
          error: 'CANNOT_RESET_SELF',
        });
      }

      const result = await authService.initiatePasswordResetByAdmin(targetUserId, adminId);

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      authLogger.error('Erro no controller de reset de senha pelo admin:', error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.status(404).send({
          success: false,
          message: 'Usuário alvo não encontrado',
          error: 'NOT_FOUND',
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao tentar resetar a senha do usuário',
      });
    }
  }

  /**
   * Atualizar usuário (Admin)
   */
  public async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const updateData = request.body as UpdateUserBody;

      authLogger.info('Admin atualizando usuário', {
        adminId: (request.user as { id: string }).id,
        targetUserId: id,
        fields: Object.keys(updateData),
      });

      const existingUser = await userModel.findById(id);
      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          message: 'Usuário não encontrado',
          error: 'NOT_FOUND',
        });
      }

      if (updateData.email) {
        const emailExists = await userModel.emailExists(updateData.email, id);
        if (emailExists) {
          return reply.status(409).send({
            success: false,
            message: 'Email já está em uso por outro usuário',
            error: 'CONFLICT',
          });
        }
      }

      if (updateData.username) {
        const usernameExists = await userModel.usernameExists(updateData.username, id);
        if (usernameExists) {
          return reply.status(409).send({
            success: false,
            message: 'Nome de usuário já está em uso por outro usuário',
            error: 'CONFLICT',
          });
        }
      }

      // Hash da senha se fornecida (corrigindo bug de hash duplo)
      if (updateData.password) {
        const { passwordService } = await import('../../../shared/utils/password.js');
        updateData.password = await passwordService.hashPassword(updateData.password);
      }

      const updatedUser = await userModel.update(id, updateData);

      if (!updatedUser) {
        return reply.status(404).send({
          success: false,
          message: 'Usuário não encontrado',
          error: 'NOT_FOUND',
        });
      }

      const { password, ...sanitizedUser } = updatedUser;

      return reply.status(200).send({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: sanitizedUser,
      });
    } catch (error) {
      authLogger.error('Erro ao atualizar usuário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao atualizar usuário',
      });
    }
  }

  /**
   * Deletar usuário (Admin)
   */
  public async deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      authLogger.info('Admin deletando usuário', {
        adminId: (request.user as { id: string }).id,
        targetUserId: id,
      });

      if (id === (request.user as { id: string }).id) {
        return reply.status(400).send({
          success: false,
          message: 'Você não pode deletar sua própria conta',
          error: 'CANNOT_DELETE_SELF',
        });
      }

      const deleted = await userModel.delete(id);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          message: 'Usuário não encontrado',
          error: 'NOT_FOUND',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Usuário deletado com sucesso',
      });
    } catch (error) {
      authLogger.error('Erro ao deletar usuário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao deletar usuário',
      });
    }
  }
}

export const authController = AuthController.getInstance();
export default authController;
