// Salve em: apps/backend/src/modules/auth/models/User.ts

import { Brackets, FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { AppDataSource } from '../../../data-source.js';
import { UserEntity } from '../../../entities/user.entity.js';
import type { UserPermission, UserRole, UserStatus } from '../../../shared/constants/index.js';
import { ROLE_PERMISSIONS, USER_ROLES, USER_STATUS } from '../../../shared/constants/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { passwordService } from '../../../shared/utils/password.js';

export { UserEntity as User };

export interface CreateUserData {
  email: string;
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
}

export interface UpdateUserData
  extends Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>> {}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
}

export interface UserListOptions {
  page: number;
  limit: number;
  sortBy: keyof UserEntity;
  sortOrder: 'asc' | 'desc';
  filters?: UserFilters;
}

export class UserModel {
  private static instance: UserModel;
  private userRepository: Repository<UserEntity>;

  private constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
  }

  public static getInstance(): UserModel {
    if (!UserModel.instance) {
      UserModel.instance = new UserModel();
    }
    return UserModel.instance;
  }

  public async create(userData: CreateUserData): Promise<UserEntity> {
    try {
      const hashedPassword = await passwordService.hashPassword(userData.password);

      // Lógica ajustada para ser mais explícita e agradar o TypeScript
      const newUser = new UserEntity();
      newUser.email = userData.email;
      newUser.username = userData.username;
      newUser.fullName = userData.fullName;
      newUser.password = hashedPassword;
      newUser.role = userData.role || USER_ROLES.USER;
      newUser.status = userData.status || USER_STATUS.ACTIVE;
      newUser.emailVerified = userData.emailVerified || false;
      if (newUser.emailVerified) {
        newUser.emailVerifiedAt = new Date();
      }

      const savedUser = await this.userRepository.save(newUser);
      logger.info('Usuário criado com sucesso via TypeORM', { userId: savedUser.id });
      return savedUser;
    } catch (error: any) {
      logger.error('Erro ao criar usuário via TypeORM:', error.message);
      if (error.code === '23505') {
        if (error.detail.includes('email')) throw new Error('Este email já está em uso.');
        if (error.detail.includes('username'))
          throw new Error('Este nome de usuário já está em uso.');
      }
      throw error;
    }
  }

  public async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOneBy({ id });
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  public async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOneBy({ username: username.toLowerCase() });
  }

  public async findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    const hashedToken = passwordService.hashResetToken(token);
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.passwordResetToken = :hashedToken', { hashedToken })
      .andWhere('user.passwordResetExpires > NOW()')
      .getOne();
  }

  public async update(id: string, updateData: UpdateUserData): Promise<UserEntity | null> {
    // ❌ REMOVIDO: Hash duplo da senha - o authService já faz o hash antes de chamar este método
    // if (updateData.password) {
    //   updateData.password = await passwordService.hashPassword(updateData.password);
    // }
    
    logger.info('Atualizando usuário no banco de dados', { 
      userId: id, 
      fields: Object.keys(updateData),
      hasPassword: !!updateData.password,
      passwordLength: updateData.password?.length 
    });
    
    await this.userRepository.update(id, updateData);
    logger.info('Usuário atualizado com sucesso via TypeORM', { userId: id });
    return this.findById(id);
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    const deleted = (result.affected ?? 0) > 0;
    if (deleted) {
      logger.info('Usuário deletado com sucesso via TypeORM', { userId: id });
    }
    return deleted;
  }

  public async list(options: UserListOptions): Promise<{
    users: UserEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, sortBy, sortOrder, filters } = options;
    const skip = (page - 1) * limit;

    const query = this.userRepository.createQueryBuilder('user');

    if (filters) {
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query.andWhere(
          new Brackets(qb => {
            qb.where('user.fullName ILIKE :searchTerm', { searchTerm })
              .orWhere('user.email ILIKE :searchTerm', { searchTerm })
              .orWhere('user.username ILIKE :searchTerm', { searchTerm });
          })
        );
      }
      if (filters.role) query.andWhere('user.role = :role', { role: filters.role });
      if (filters.status) query.andWhere('user.status = :status', { status: filters.status });
      if (filters.emailVerified !== undefined)
        query.andWhere('user.emailVerified = :emailVerified', {
          emailVerified: filters.emailVerified,
        });
    }

    query
      .orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit);

    const [users, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { users, total, page, limit, totalPages };
  }

  public async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const where: FindOptionsWhere<UserEntity> = { email: ILike(email) };
    if (excludeId) where.id = Not(excludeId);

    const count = await this.userRepository.count({ where });
    return count > 0;
  }

  public async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    const where: FindOptionsWhere<UserEntity> = { username: ILike(username) };
    if (excludeId) where.id = Not(excludeId);

    const count = await this.userRepository.count({ where });
    return count > 0;
  }

  public async incrementLoginAttempts(id: string): Promise<void> {
    await this.userRepository.increment({ id }, 'loginAttempts', 1);

    const user = await this.findById(id);
    if (user && user.loginAttempts >= 5) {
      const lockDuration = 15 * 60 * 1000;
      await this.userRepository.update(id, {
        lockedUntil: new Date(Date.now() + lockDuration),
      });
    }
  }

  public async resetLoginAttempts(id: string): Promise<void> {
    await this.userRepository.update(id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });
  }

  public async incrementTokenVersion(id: string): Promise<void> {
    await this.userRepository.increment({ id }, 'tokenVersion', 1);
  }

  public getUserPermissions(role: UserRole): UserPermission[] {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? [...permissions] : [];
  }
}

export const userModel = UserModel.getInstance();
export default userModel;
