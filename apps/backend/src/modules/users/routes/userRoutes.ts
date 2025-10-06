import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { USER_PERMISSIONS } from '../../../shared/constants/index.js';
import { authMiddleware } from '../../auth/middleware/authMiddleware.js';
import { userController } from '../controllers/userController.js';

// 1. Defina e exporte o schema para um único usuário.
export const userSchemaForResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  fullName: z.string(),
  role: z.string(),
  status: z.string(),
  emailVerified: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  tokenVersion: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// 2. Defina a função que registra as rotas.
export async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      preHandler: [
        authMiddleware.authenticate(),
        authMiddleware.requirePermission(USER_PERMISSIONS.USER_LIST),
      ],
      schema: {
        description: 'Listar usuários do sistema (Admin)',
        tags: ['Usuários'],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(10),
          search: z.string().min(2).max(100).optional(),
          role: z.enum(['admin', 'user', 'moderator', 'viewer']).optional(),
          status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
          sortBy: z
            .enum(['createdAt', 'updatedAt', 'email', 'username', 'fullName'])
            .default('createdAt'),
          sortOrder: z.enum(['asc', 'desc']).default('desc'),
        }),
        // 3. Use o schema exportado na definição da resposta.
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(userSchemaForResponse),
            pagination: z.object({
              page: z.number().int(),
              limit: z.number().int(),
              total: z.number().int(),
              totalPages: z.number().int(),
            }),
          }),
        },
      },
    },
    userController.list
  );
}
