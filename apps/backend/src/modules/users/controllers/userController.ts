// apps/backend/src/modules/users/controllers/userController.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../../shared/utils/logger.js';
import { userModel } from '../../auth/models/User.js'; // Reutilizamos o model que funciona

// Interface para os query params, para manter a tipagem forte
interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'user' | 'moderator' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'username' | 'fullName';
  sortOrder?: 'asc' | 'desc';
}

class UserController {
  // SUBSTITUA O MÉTODO INTEIRO POR ESTA NOVA VERSÃO DE DEBUG
  public async list(request: FastifyRequest<{ Querystring: ListUsersQuery }>, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;
      const result = await userModel.list({
        page,
        limit,
        sortBy,
        sortOrder,
        filters: request.query,
      });

      const usersDTO = result.users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role ? user.role.trim() : user.role,
        status: user.status ? user.status.trim() : user.status,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        tokenVersion: user.tokenVersion,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));

      return reply.status(200).send({
        success: true,
        message: 'Usuários recuperados com sucesso',
        data: usersDTO,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Erro GERAL ao listar usuários:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno ao listar usuários',
      });
    }
  }
}

export const userController = new UserController();
