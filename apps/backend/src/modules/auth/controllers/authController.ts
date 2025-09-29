import { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '../../../shared/constants/index.js';
import { USER_ROLES } from '../../../shared/constants/index.js';
import { authLogger, logger } from '../../../shared/utils/logger.js';
import { responseHelper } from '../../../shared/utils/responseHelper.js';
import { userModel } from '../models/User.js';
import { authService } from '../services/authService.js';

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
  status?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserBody {
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  status?: string;
}

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: string;
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
  public async register(
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email, username, fullName, password, acceptTerms } = request.body;

      authLogger.info('Tentativa de registro', { email, username });

      const result = await authService.register({
        email,
        username,
        fullName,
        password,
        acceptTerms,
      });

      responseHelper.created(reply, result.user, result.message);
    } catch (error) {
      authLogger.error('Erro no registro:', error);

      if (error instanceof Error) {
        if (error.message.includes('já está em uso') || error.message.includes('já existe')) {
          return responseHelper.conflictError(reply, error.message);
        }

        if (error.message.includes('não atende aos critérios')) {
          return responseHelper.validationError(reply, [error.message]);
        }
      }

      responseHelper.serverError(reply, 'Erro interno no registro');
    }
  }

  /**
   * Fazer login
   */
  public async login(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply
  ): Promise<void> {
    // O tipo de retorno muda para Promise<void>
    try {
      const { email, password, rememberMe } = request.body;
      const ipAddress = request.ip;

      authLogger.info('Tentativa de login', { email, ip: ipAddress });

      const result = await authService.login({ email, password, rememberMe }, ipAddress);

      // A CORREÇÃO ESTÁ AQUI:
      // Em vez de usar o responseHelper, enviamos a resposta diretamente.
      return reply.send({
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
          return responseHelper.authenticationError(reply, 'Email ou senha incorretos');
        }

        if (error.message.includes('bloqueada')) {
          return responseHelper.error(reply, error.message, 423, 'ACCOUNT_LOCKED');
        }

        if (error.message.includes('inativa') || error.message.includes('suspensa')) {
          return responseHelper.error(reply, error.message, 403, 'ACCOUNT_DISABLED');
        }

        if (error.message.includes('pendente')) {
          return responseHelper.error(reply, error.message, 403, 'ACCOUNT_PENDING');
        }
      }

      responseHelper.serverError(reply, 'Erro interno no login');
    }
  }

  /**
   * Renovar token de acesso
   */
  public async refreshToken(
    request: FastifyRequest<{ Body: RefreshTokenBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { refreshToken } = request.body;

      authLogger.info('Tentativa de renovação de token');

      const result = await authService.refreshToken(refreshToken);

      responseHelper.tokenRefreshed(reply, result, 'Token renovado com sucesso');
    } catch (error) {
      authLogger.error('Erro na renovação de token:', error);

      if (error instanceof Error) {
        if (error.message.includes('expirado') || error.message.includes('inválido')) {
          return responseHelper.authenticationError(reply, 'Token de refresh inválido ou expirado');
        }

        if (error.message.includes('não encontrado')) {
          return responseHelper.notFoundError(reply, 'Usuário não encontrado');
        }

        if (error.message.includes('inativo')) {
          return responseHelper.error(reply, 'Usuário inativo', 403, 'USER_INACTIVE');
        }
      }

      responseHelper.serverError(reply, 'Erro interno na renovação do token');
    }
  }

  /**
   * Solicitar reset de senha
   */
  public async requestPasswordReset(
    request: FastifyRequest<{ Body: PasswordResetRequestBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email } = request.body;

      authLogger.info('Solicitação de reset de senha', { email });

      const result = await authService.requestPasswordReset({ email });

      responseHelper.emailSent(reply, result.message);
    } catch (error) {
      authLogger.error('Erro na solicitação de reset de senha:', error);

      if (error instanceof Error && error.message.includes('Falha ao enviar email')) {
        return responseHelper.serverError(reply, 'Falha ao enviar email de recuperação');
      }

      responseHelper.serverError(reply, 'Erro interno na solicitação de reset');
    }
  }

  /**
   * Resetar senha
   */
  public async resetPassword(
    request: FastifyRequest<{ Body: PasswordResetBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { token, newPassword } = request.body;

      authLogger.info('Tentativa de reset de senha');

      const result = await authService.resetPassword({ token, newPassword });

      responseHelper.passwordChanged(reply, result.message);
    } catch (error) {
      authLogger.error('Erro no reset de senha:', error);

      if (error instanceof Error) {
        if (error.message.includes('inválido') || error.message.includes('expirado')) {
          return responseHelper.error(reply, error.message, 400, 'INVALID_RESET_TOKEN');
        }

        if (error.message.includes('não atende aos critérios')) {
          return responseHelper.validationError(reply, [error.message]);
        }

        if (error.message.includes('deve ser diferente')) {
          return responseHelper.error(reply, error.message, 400, 'SAME_PASSWORD');
        }
      }

      responseHelper.serverError(reply, 'Erro interno no reset de senha');
    }
  }

  /**
   * Alterar senha (usuário logado)
   */
  public async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = request.body;
      const userId = request.user!.id;

      authLogger.info('Tentativa de alteração de senha', { userId });

      const result = await authService.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      responseHelper.passwordChanged(reply, result.message);
    } catch (error) {
      authLogger.error('Erro na alteração de senha:', error);

      if (error instanceof Error) {
        if (error.message.includes('incorreta')) {
          return responseHelper.error(
            reply,
            'Senha atual incorreta',
            400,
            'INVALID_CURRENT_PASSWORD'
          );
        }

        if (error.message.includes('não atende aos critérios')) {
          return responseHelper.validationError(reply, [error.message]);
        }

        if (error.message.includes('deve ser diferente')) {
          return responseHelper.error(reply, error.message, 400, 'SAME_PASSWORD');
        }
      }

      responseHelper.serverError(reply, 'Erro interno na alteração de senha');
    }
  }

  /**
   * Logout
   */
  public async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.id;

      authLogger.info('Tentativa de logout', { userId });

      const result = await authService.logout(userId);

      responseHelper.logoutSuccess(reply, result.message);
    } catch (error) {
      authLogger.error('Erro no logout:', error);
      responseHelper.serverError(reply, 'Erro interno no logout');
    }
  }

  /**
   * Obter perfil do usuário logado
   */
  public async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.id;

      const profile = await authService.getProfile(userId);

      responseHelper.success(reply, profile, 'Perfil recuperado com sucesso');
    } catch (error) {
      logger.error('Erro ao obter perfil:', error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return responseHelper.notFoundError(reply, 'Usuário não encontrado');
      }

      responseHelper.serverError(reply, 'Erro interno ao obter perfil');
    }
  }

  /**
   * Atualizar perfil do usuário logado
   */
  public async updateProfile(
    request: FastifyRequest<{ Body: UpdateProfileBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user!.id;
      const updateData = request.body;

      authLogger.info('Atualizando perfil', { userId, fields: Object.keys(updateData) });

      const updatedProfile = await authService.updateProfile(userId, updateData);

      responseHelper.updated(reply, updatedProfile, 'Perfil atualizado com sucesso');
    } catch (error) {
      authLogger.error('Erro ao atualizar perfil:', error);

      if (error instanceof Error) {
        if (error.message.includes('já está em uso')) {
          return responseHelper.conflictError(reply, error.message);
        }

        if (error.message.includes('não encontrado')) {
          return responseHelper.notFoundError(reply, 'Usuário não encontrado');
        }
      }

      responseHelper.serverError(reply, 'Erro interno ao atualizar perfil');
    }
  }

  /**
   * Verificar se email existe
   */
  public async checkEmail(
    request: FastifyRequest<{ Querystring: { email: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email } = request.query;

      const result = await authService.checkEmailExists(email);

      responseHelper.success(reply, result, 'Verificação realizada');
    } catch (error) {
      logger.error('Erro ao verificar email:', error);
      responseHelper.serverError(reply, 'Erro interno na verificação');
    }
  }

  /**
   * Verificar se username existe
   */
  public async checkUsername(
    request: FastifyRequest<{ Querystring: { username: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { username } = request.query;

      const result = await authService.checkUsernameExists(username);

      responseHelper.success(reply, result, 'Verificação realizada');
    } catch (error) {
      logger.error('Erro ao verificar username:', error);
      responseHelper.serverError(reply, 'Erro interno na verificação');
    }
  }

  /**
   * Listar usuários (Admin)
   */
  public async listUsers(
    request: FastifyRequest<{ Querystring: ListUsersQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = request.query;

      const options = {
        page,
        limit,
        sortBy,
        sortOrder,
        filters: {
          search,
          role,
          status,
        },
      };

      const result = await userModel.list(options);

      // Remover senhas dos usuários
      const sanitizedUsers = result.users.map(user => {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
      });

      responseHelper.successWithPagination(
        reply,
        sanitizedUsers,
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
        'Usuários recuperados com sucesso'
      );
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      responseHelper.serverError(reply, 'Erro interno ao listar usuários');
    }
  }

  /**
   * Obter usuário por ID (Admin)
   */
  public async getUserById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;

      const user = await userModel.findById(id);

      if (!user) {
        return responseHelper.notFoundError(reply, 'Usuário não encontrado');
      }

      // Remover senha
      const { password, ...sanitizedUser } = user;

      responseHelper.success(reply, sanitizedUser, 'Usuário recuperado com sucesso');
    } catch (error) {
      logger.error('Erro ao obter usuário por ID:', error);
      responseHelper.serverError(reply, 'Erro interno ao obter usuário');
    }
  }

  /**
   * Criar usuário (Admin)
   */
  public async createUser(
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const adminId = request.user!.id;
      const userData = request.body;

      authLogger.info('Admin criando usuário', { adminId, email: userData.email });

      const result = await authService.createUserByAdmin({
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        password: userData.password,
        role: userData.role || USER_ROLES.USER,
        status: (userData.status as any) || 'active',
        sendWelcomeEmail: userData.sendWelcomeEmail,
      });

      const responseData = {
        user: result.user,
        temporaryPassword: result.temporaryPassword,
      };

      responseHelper.created(reply, responseData, 'Usuário criado com sucesso');
    } catch (error) {
      authLogger.error('Erro ao criar usuário:', error);
      if (error instanceof Error) {
        if (error.message.includes('já está em uso')) {
          return responseHelper.conflictError(reply, error.message);
        }
      }
      responseHelper.serverError(reply, 'Erro interno ao criar usuário');
    }
  }

  /**
   * Atualizar usuário (Admin)
   */
  public async updateUser(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      const updateData = request.body;

      authLogger.info('Admin atualizando usuário', {
        adminId: request.user!.id,
        targetUserId: id,
        fields: Object.keys(updateData),
      });

      // Verificar se usuário existe
      const existingUser = await userModel.findById(id);
      if (!existingUser) {
        return responseHelper.notFoundError(reply, 'Usuário não encontrado');
      }

      // Verificar conflitos de email e username
      if (updateData.email) {
        const emailExists = await userModel.emailExists(updateData.email, id);
        if (emailExists) {
          return responseHelper.conflictError(reply, 'Email já está em uso por outro usuário');
        }
      }

      if (updateData.username) {
        const usernameExists = await userModel.usernameExists(updateData.username, id);
        if (usernameExists) {
          return responseHelper.conflictError(
            reply,
            'Nome de usuário já está em uso por outro usuário'
          );
        }
      }

      // Atualizar usuário
      const updatedUser = await userModel.update(id, updateData);

      if (!updatedUser) {
        return responseHelper.notFoundError(reply, 'Usuário não encontrado');
      }

      // Remover senha
      const { password, ...sanitizedUser } = updatedUser;

      responseHelper.updated(reply, sanitizedUser, 'Usuário atualizado com sucesso');
    } catch (error) {
      authLogger.error('Erro ao atualizar usuário:', error);
      responseHelper.serverError(reply, 'Erro interno ao atualizar usuário');
    }
  }

  /**
   * Deletar usuário (Admin)
   */
  public async deleteUser(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;

      authLogger.info('Admin deletando usuário', {
        adminId: request.user!.id,
        targetUserId: id,
      });

      // Verificar se usuário existe
      const existingUser = await userModel.findById(id);
      if (!existingUser) {
        return responseHelper.notFoundError(reply, 'Usuário não encontrado');
      }

      // Não permitir que admin delete a si mesmo
      if (id === request.user!.id) {
        return responseHelper.error(
          reply,
          'Você não pode deletar sua própria conta',
          400,
          'CANNOT_DELETE_SELF'
        );
      }

      // Deletar usuário
      const deleted = await userModel.delete(id);

      if (!deleted) {
        return responseHelper.notFoundError(reply, 'Usuário não encontrado');
      }

      responseHelper.deleted(reply, 'Usuário deletado com sucesso');
    } catch (error) {
      authLogger.error('Erro ao deletar usuário:', error);
      responseHelper.serverError(reply, 'Erro interno ao deletar usuário');
    }
  }
}

export const authController = AuthController.getInstance();
export default authController;
