import { database } from '../../../config/database.js';
import type { UserPermission, UserRole, UserStatus } from '../../../shared/constants/index.js';
import { ROLE_PERMISSIONS, USER_ROLES, USER_STATUS } from '../../../shared/constants/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { passwordService } from '../../../shared/utils/password.js';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  tokenVersion?: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
}

export interface UserListOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters?: UserFilters;
}

export class UserModel {
  private static instance: UserModel;

  private constructor() {}

  public static getInstance(): UserModel {
    if (!UserModel.instance) {
      UserModel.instance = new UserModel();
    }
    return UserModel.instance;
  }

  /**
   * Criar novo usuário
   */
  public async create(userData: CreateUserData): Promise<User> {
    try {
      const hashedPassword = await passwordService.hashPassword(userData.password);

      const columns = [
        'email',
        'username',
        'full_name',
        'password',
        'role',
        'status',
        'email_verified',
        'token_version',
      ];

      const values = [
        userData.email,
        userData.username,
        userData.fullName,
        hashedPassword,
        userData.role || USER_ROLES.USER,
        userData.status || USER_STATUS.ACTIVE,
        userData.emailVerified || false,
        1, // token_version inicial
      ];

      // Lógica para satisfazer a constraint "check_email_verified_consistency"
      if (userData.emailVerified) {
        columns.push('email_verified_at');
        values.push(new Date()); // Adiciona a data e hora atuais
      }

      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO users (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await database.query(query, values);
      const user = this.mapRowToUser(result.rows[0]);

      logger.info('Usuário criado com sucesso', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  /**
   * Buscar usuário por ID
   */
  public async findById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  /**
   * Buscar usuário por email
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await database.query(query, [email.toLowerCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  /**
   * Buscar usuário por username
   */
  public async findByUsername(username: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await database.query(query, [username.toLowerCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar usuário por username:', error);
      throw error;
    }
  }

  /**
   * Buscar usuário por token de reset de senha
   */
  public async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      const hashedToken = passwordService.hashResetToken(token);
      const query = `
        SELECT * FROM users 
        WHERE password_reset_token = $1 
        AND password_reset_expires > NOW()
      `;
      const result = await database.query(query, [hashedToken]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar usuário por token de reset:', error);
      throw error;
    }
  }

  /**
   * Atualizar usuário
   */
  public async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Construir query dinamicamente
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = this.camelToSnakeCase(key);
          fields.push(`${dbField} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      // Sempre atualizar updated_at
      fields.push(`updated_at = NOW()`);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const user = this.mapRowToUser(result.rows[0]);

      logger.info('Usuário atualizado com sucesso', {
        userId: user.id,
        updatedFields: Object.keys(updateData),
      });

      return user;
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  /**
   * Deletar usuário
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await database.query(query, [id]);

      const deleted = result.rowCount > 0;

      if (deleted) {
        logger.info('Usuário deletado com sucesso', { userId: id });
      }

      return deleted;
    } catch (error) {
      logger.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  /**
   * Listar usuários com paginação e filtros
   */
  public async list(options: UserListOptions): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page, limit, sortBy, sortOrder, filters } = options;
      const offset = (page - 1) * limit;

      // Construir WHERE clause
      const whereConditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.search) {
        whereConditions.push(`(
          full_name ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex} OR 
          username ILIKE $${paramIndex}
        )`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.role) {
        whereConditions.push(`role = $${paramIndex}`);
        values.push(filters.role);
        paramIndex++;
      }

      if (filters?.status) {
        whereConditions.push(`status = $${paramIndex}`);
        values.push(filters.status);
        paramIndex++;
      }

      if (filters?.emailVerified !== undefined) {
        whereConditions.push(`email_verified = $${paramIndex}`);
        values.push(filters.emailVerified);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query para contar total
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await database.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Query para buscar usuários
      const dbSortBy = this.camelToSnakeCase(sortBy);
      const usersQuery = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const usersResult = await database.query(usersQuery, values);

      const users = usersResult.rows.map(row => this.mapRowToUser(row));
      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  /**
   * Verificar se email já existe
   */
  public async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      let query = 'SELECT id FROM users WHERE email = $1';
      const values = [email.toLowerCase()];

      if (excludeId) {
        query += ' AND id != $2';
        values.push(excludeId);
      }

      const result = await database.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Erro ao verificar se email existe:', error);
      throw error;
    }
  }

  /**
   * Verificar se username já existe
   */
  public async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    try {
      let query = 'SELECT id FROM users WHERE username = $1';
      const values = [username.toLowerCase()];

      if (excludeId) {
        query += ' AND id != $2';
        values.push(excludeId);
      }

      const result = await database.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Erro ao verificar se username existe:', error);
      throw error;
    }
  }

  /**
   * Incrementar tentativas de login
   */
  public async incrementLoginAttempts(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET login_attempts = login_attempts + 1,
            locked_until = CASE 
              WHEN login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
              ELSE locked_until
            END
        WHERE id = $1
      `;
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Erro ao incrementar tentativas de login:', error);
      throw error;
    }
  }

  /**
   * Resetar tentativas de login
   */
  public async resetLoginAttempts(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, last_login_at = NOW()
        WHERE id = $1
      `;
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Erro ao resetar tentativas de login:', error);
      throw error;
    }
  }

  /**
   * Incrementar versão do token (para invalidar tokens existentes)
   */
  public async incrementTokenVersion(id: string): Promise<void> {
    try {
      const query = 'UPDATE users SET token_version = token_version + 1 WHERE id = $1';
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Erro ao incrementar versão do token:', error);
      throw error;
    }
  }

  /**
   * Obter permissões do usuário baseadas no role
   */
  public getUserPermissions(role: UserRole): UserPermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Mapear row do banco para objeto User
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      fullName: row.full_name,
      password: row.password,
      role: row.role,
      status: row.status,
      emailVerified: row.email_verified,
      emailVerifiedAt: row.email_verified_at,
      lastLoginAt: row.last_login_at,
      loginAttempts: row.login_attempts,
      lockedUntil: row.locked_until,
      passwordResetToken: row.password_reset_token,
      passwordResetExpires: row.password_reset_expires,
      emailVerificationToken: row.email_verification_token,
      emailVerificationExpires: row.email_verification_expires,
      tokenVersion: row.token_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Converter camelCase para snake_case
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const userModel = UserModel.getInstance();
export default userModel;
