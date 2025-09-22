import { userModel, User, CreateUserData } from '../models/User.js';
import { passwordService } from '../../../shared/utils/password.js';
import { jwtService } from '../../../shared/utils/jwt.js';
import { emailService } from './emailService.js';
import { logger, authLogger, securityLogger } from '../../../shared/utils/logger.js';
import { environment } from '../../../config/environment.js';
import { USER_STATUS, USER_ROLES } from '../../../shared/constants/index.js';
import type { UserRole, UserStatus } from '../../../shared/constants/index.js';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RegisterData {
  email: string;
  username: string;
  fullName: string;
  password: string;
  acceptTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  newPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Registrar novo usuário
   */
  public async register(registerData: RegisterData): Promise<{
    user: Omit<User, 'password'>;
    message: string;
  }> {
    try {
      authLogger.info('Iniciando registro de usuário', { email: registerData.email });

      // Verificar se email já existe
      const existingEmail = await userModel.emailExists(registerData.email);
      if (existingEmail) {
        throw new Error('Email já está em uso');
      }

      // Verificar se username já existe
      const existingUsername = await userModel.usernameExists(registerData.username);
      if (existingUsername) {
        throw new Error('Nome de usuário já está em uso');
      }

      // Validar força da senha
      const passwordValidation = passwordService.validatePassword(registerData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Senha não atende aos critérios: ${passwordValidation.errors.join(', ')}`);
      }

      // Criar usuário
      const userData: CreateUserData = {
        email: registerData.email.toLowerCase(),
        username: registerData.username.toLowerCase(),
        fullName: registerData.fullName,
        password: registerData.password,
        role: USER_ROLES.USER,
        status: environment.email.enabled ? USER_STATUS.PENDING : USER_STATUS.ACTIVE,
        emailVerified: !environment.email.enabled
      };

      const user = await userModel.create(userData);

      // Enviar email de boas-vindas se habilitado
      if (environment.email.enabled) {
        try {
          await emailService.sendWelcomeEmail(user.email, {
            name: user.fullName,
            username: user.username
          });
          authLogger.info('Email de boas-vindas enviado', { userId: user.id });
        } catch (emailError) {
          authLogger.warn('Falha ao enviar email de boas-vindas', { 
            userId: user.id, 
            error: emailError 
          });
        }
      }

      authLogger.info('Usuário registrado com sucesso', {
        userId: user.id,
        email: user.email,
        username: user.username
      });

      return {
        user: this.sanitizeUser(user),
        message: environment.email.enabled 
          ? 'Usuário registrado com sucesso. Verifique seu email para ativar a conta.'
          : 'Usuário registrado com sucesso.'
      };

    } catch (error) {
      authLogger.error('Erro no registro de usuário:', error);
      throw error;
    }
  }

  /**
   * Fazer login
   */
  public async login(credentials: LoginCredentials, ipAddress?: string): Promise<LoginResult> {
    try {
      authLogger.info('Tentativa de login', { email: credentials.email, ip: ipAddress });

      // Buscar usuário por email
      const user = await userModel.findByEmail(credentials.email);
      if (!user) {
        securityLogger.warn('Tentativa de login com email inexistente', { 
          email: credentials.email, 
          ip: ipAddress 
        });
        throw new Error('Credenciais inválidas');
      }

      // Verificar se conta está bloqueada
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const unlockTime = user.lockedUntil.toLocaleString('pt-BR');
        securityLogger.warn('Tentativa de login em conta bloqueada', {
          userId: user.id,
          email: user.email,
          unlockTime,
          ip: ipAddress
        });
        throw new Error(`Conta temporariamente bloqueada. Tente novamente após ${unlockTime}`);
      }

      // Verificar status da conta
      if (user.status === USER_STATUS.INACTIVE) {
        throw new Error('Conta inativa. Entre em contato com o suporte');
      }

      if (user.status === USER_STATUS.SUSPENDED) {
        throw new Error('Conta suspensa. Entre em contato com o suporte');
      }

      if (user.status === USER_STATUS.PENDING && environment.email.enabled) {
        throw new Error('Conta pendente de verificação. Verifique seu email');
      }

      // Verificar senha
      const isPasswordValid = await passwordService.verifyPassword(credentials.password, user.password);
      
      if (!isPasswordValid) {
        // Incrementar tentativas de login
        await userModel.incrementLoginAttempts(user.id);
        
        securityLogger.warn('Tentativa de login com senha incorreta', {
          userId: user.id,
          email: user.email,
          attempts: user.loginAttempts + 1,
          ip: ipAddress
        });
        
        throw new Error('Credenciais inválidas');
      }

      // Reset tentativas de login e atualizar último login
      await userModel.resetLoginAttempts(user.id);

      // Gerar tokens
      const userPermissions = userModel.getUserPermissions(user.role);
      const tokens = jwtService.generateTokenPair({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: userPermissions,
        tokenVersion: user.tokenVersion
      });

      authLogger.info('Login realizado com sucesso', {
        userId: user.id,
        email: user.email,
        ip: ipAddress
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens
      };

    } catch (error) {
      authLogger.error('Erro no login:', error);
      throw error;
    }
  }

  /**
   * Renovar token de acesso
   */
  public async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: string;
  }> {
    try {
      // Verificar refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken);

      // Buscar usuário
      const user = await userModel.findById(payload.id);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se token version ainda é válida
      if (payload.tokenVersion !== user.tokenVersion) {
        throw new Error('Token inválido');
      }

      // Verificar status do usuário
      if (user.status !== USER_STATUS.ACTIVE) {
        throw new Error('Usuário inativo');
      }

      // Gerar novo access token
      const userPermissions = userModel.getUserPermissions(user.role);
      const accessToken = jwtService.generateAccessToken({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: userPermissions
      });

      authLogger.info('Token renovado com sucesso', { userId: user.id });

      return {
        accessToken,
        expiresIn: environment.jwt.expiresIn
      };

    } catch (error) {
      authLogger.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  /**
   * Solicitar reset de senha
   */
  public async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    try {
      authLogger.info('Solicitação de reset de senha', { email: data.email });

      const user = await userModel.findByEmail(data.email);
      if (!user) {
        // Por segurança, sempre retornar sucesso mesmo se email não existir
        return { message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha' };
      }

      // Gerar token de reset
      const resetToken = passwordService.generateResetToken();
      const hashedToken = passwordService.hashResetToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Salvar token no banco
      await userModel.update(user.id, {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt
      });

      // Enviar email se habilitado
      if (environment.email.enabled) {
        try {
          await emailService.sendPasswordResetEmail(user.email, {
            name: user.fullName,
            resetToken,
            expiresIn: '1 hora'
          });
          authLogger.info('Email de reset de senha enviado', { userId: user.id });
        } catch (emailError) {
          authLogger.error('Falha ao enviar email de reset', { 
            userId: user.id, 
            error: emailError 
          });
          throw new Error('Falha ao enviar email de recuperação');
        }
      }

      return { message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha' };

    } catch (error) {
      authLogger.error('Erro na solicitação de reset de senha:', error);
      throw error;
    }
  }

  /**
   * Resetar senha
   */
  public async resetPassword(data: PasswordResetData): Promise<{ message: string }> {
    try {
      authLogger.info('Tentativa de reset de senha');

      // Buscar usuário pelo token
      const user = await userModel.findByPasswordResetToken(data.token);
      if (!user) {
        throw new Error('Token de recuperação inválido ou expirado');
      }

      // Validar nova senha
      const passwordValidation = passwordService.validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Nova senha não atende aos critérios: ${passwordValidation.errors.join(', ')}`);
      }

      // Verificar se nova senha é diferente da atual
      const isDifferent = await passwordService.isPasswordDifferent(data.newPassword, user.password);
      if (!isDifferent) {
        throw new Error('A nova senha deve ser diferente da senha atual');
      }

      // Hash da nova senha
      const hashedPassword = await passwordService.hashPassword(data.newPassword);

      // Atualizar senha e limpar tokens de reset
      await userModel.update(user.id, {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        tokenVersion: user.tokenVersion + 1 // Invalidar todos os tokens existentes
      });

      // Enviar email de confirmação se habilitado
      if (environment.email.enabled) {
        try {
          await emailService.sendPasswordChangedEmail(user.email, {
            name: user.fullName
          });
          authLogger.info('Email de confirmação de alteração de senha enviado', { userId: user.id });
        } catch (emailError) {
          authLogger.warn('Falha ao enviar email de confirmação', { 
            userId: user.id, 
            error: emailError 
          });
        }
      }

      authLogger.info('Senha resetada com sucesso', { userId: user.id });

      return { message: 'Senha alterada com sucesso' };

    } catch (error) {
      authLogger.error('Erro no reset de senha:', error);
      throw error;
    }
  }

  /**
   * Alterar senha (usuário logado)
   */
  public async changePassword(userId: string, data: ChangePasswordData): Promise<{ message: string }> {
    try {
      authLogger.info('Tentativa de alteração de senha', { userId });

      // Buscar usuário
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await passwordService.verifyPassword(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Senha atual incorreta');
      }

      // Validar nova senha
      const passwordValidation = passwordService.validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Nova senha não atende aos critérios: ${passwordValidation.errors.join(', ')}`);
      }

      // Verificar se nova senha é diferente da atual
      const isDifferent = await passwordService.isPasswordDifferent(data.newPassword, user.password);
      if (!isDifferent) {
        throw new Error('A nova senha deve ser diferente da senha atual');
      }

      // Hash da nova senha
      const hashedPassword = await passwordService.hashPassword(data.newPassword);

      // Atualizar senha
      await userModel.update(userId, {
        password: hashedPassword,
        tokenVersion: user.tokenVersion + 1 // Invalidar todos os tokens existentes
      });

      // Enviar email de confirmação se habilitado
      if (environment.email.enabled) {
        try {
          await emailService.sendPasswordChangedEmail(user.email, {
            name: user.fullName
          });
          authLogger.info('Email de confirmação de alteração de senha enviado', { userId });
        } catch (emailError) {
          authLogger.warn('Falha ao enviar email de confirmação', { 
            userId, 
            error: emailError 
          });
        }
      }

      authLogger.info('Senha alterada com sucesso', { userId });

      return { message: 'Senha alterada com sucesso' };

    } catch (error) {
      authLogger.error('Erro na alteração de senha:', error);
      throw error;
    }
  }

  /**
   * Logout (invalidar tokens)
   */
  public async logout(userId: string): Promise<{ message: string }> {
    try {
      // Incrementar token version para invalidar todos os tokens
      await userModel.incrementTokenVersion(userId);

      authLogger.info('Logout realizado com sucesso', { userId });

      return { message: 'Logout realizado com sucesso' };

    } catch (error) {
      authLogger.error('Erro no logout:', error);
      throw error;
    }
  }

  /**
   * Obter perfil do usuário
   */
  public async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      return this.sanitizeUser(user);

    } catch (error) {
      authLogger.error('Erro ao obter perfil:', error);
      throw error;
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  public async updateProfile(userId: string, updateData: {
    fullName?: string;
    username?: string;
    email?: string;
  }): Promise<Omit<User, 'password'>> {
    try {
      authLogger.info('Atualizando perfil do usuário', { userId, fields: Object.keys(updateData) });

      // Verificar se email já existe (se está sendo alterado)
      if (updateData.email) {
        const emailExists = await userModel.emailExists(updateData.email, userId);
        if (emailExists) {
          throw new Error('Email já está em uso por outro usuário');
        }
        updateData.email = updateData.email.toLowerCase();
      }

      // Verificar se username já existe (se está sendo alterado)
      if (updateData.username) {
        const usernameExists = await userModel.usernameExists(updateData.username, userId);
        if (usernameExists) {
          throw new Error('Nome de usuário já está em uso por outro usuário');
        }
        updateData.username = updateData.username.toLowerCase();
      }

      // Atualizar usuário
      const updatedUser = await userModel.update(userId, updateData);
      if (!updatedUser) {
        throw new Error('Usuário não encontrado');
      }

      authLogger.info('Perfil atualizado com sucesso', { userId });

      return this.sanitizeUser(updatedUser);

    } catch (error) {
      authLogger.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  /**
   * Verificar se email existe
   */
  public async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    try {
      const exists = await userModel.emailExists(email);
      return { exists };
    } catch (error) {
      logger.error('Erro ao verificar email:', error);
      throw error;
    }
  }

  /**
   * Verificar se username existe
   */
  public async checkUsernameExists(username: string): Promise<{ exists: boolean }> {
    try {
      const exists = await userModel.usernameExists(username);
      return { exists };
    } catch (error) {
      logger.error('Erro ao verificar username:', error);
      throw error;
    }
  }

  /**
   * Remover dados sensíveis do usuário
   */
  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = AuthService.getInstance();
export default authService;