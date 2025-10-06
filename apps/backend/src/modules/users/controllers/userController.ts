//apps/backend/src/modules/users/controllers/userController.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../../shared/utils/logger.js';
import { UserFilters, userModel } from '../../auth/models/User.js';

class UserController {
  public async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

      const filters: UserFilters = {};
      if (query.search) filters.search = query.search;
      if (query.role) filters.role = query.role;
      if (query.status) filters.status = query.status;

      const result = await userModel.list({
        page,
        limit,
        sortBy,
        sortOrder,
        filters,
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
