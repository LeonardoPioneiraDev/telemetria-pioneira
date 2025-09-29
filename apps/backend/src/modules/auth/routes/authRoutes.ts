import { FastifyInstance } from 'fastify';
import z from 'zod';
import { USER_PERMISSIONS } from '../../../shared/constants/index.js';
import { rateLimiter } from '../../../shared/middleware/rateLimiter.js';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authValidators } from '../validators/authValidators.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Prefixo para todas as rotas de autenticação
  await fastify.register(
    async function (fastify) {
      // ==========================================
      // 🔓 ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
      // ==========================================

      // Registro de usuário
      fastify.post(
        '/login',
        {
          // O preHandler continua o mesmo
          preHandler: [rateLimiter.getAuthRateLimit()],
          schema: {
            description: 'Fazer login',
            tags: ['Autenticação'],
            // 2. O 'body' agora é um schema Zod
            body: z.object({
              email: z.string().email({ message: 'Formato de e-mail inválido.' }),
              password: z.string().min(1, { message: 'A senha é obrigatória.' }),
              rememberMe: z.boolean().optional().default(false),
            }),
            response: {
              200: z.object({
                success: z.boolean(),
                message: z.string(),
                data: z.object({
                  user: z.object({
                    /* defina as propriedades do usuário aqui */
                  }),
                  accessToken: z.string(),
                  refreshToken: z.string(),
                  expiresIn: z.string(),
                }),
              }),
            },
          },
        },
        authController.login
      );

      // Rota de Registro (Convertida para Zod)
      fastify.post(
        '/register',
        {
          preHandler: [rateLimiter.getAuthRateLimit()],
          schema: {
            description: 'Registrar novo usuário',
            tags: ['Autenticação'],
            body: z.object({
              email: z.string().email(),
              username: z.string().min(3).max(50),
              fullName: z.string().min(2).max(100),
              password: z.string().min(8),
              acceptTerms: z
                .boolean()
                .refine(val => val === true, { message: 'É necessário aceitar os termos de uso.' }),
            }),
            response: {
              201: z.object({
                success: z.boolean(),
                message: z.string(),
                data: z.object({
                  id: z.string(),
                  email: z.string(),
                  username: z.string(),
                  fullName: z.string(),
                  role: z.string(),
                  status: z.string(),
                  emailVerified: z.boolean(),
                  createdAt: z.string(),
                }),
              }),
            },
          },
        },
        authController.register
      );

      // Renovar token
      fastify.post(
        '/refresh',
        {
          preHandler: [authValidators.refreshToken()],
          schema: {
            description: 'Renovar token de acesso',
            tags: ['Autenticação'],
            body: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        authController.refreshToken
      );

      // Solicitar reset de senha
      fastify.post(
        '/password/reset-request',
        {
          preHandler: [
            rateLimiter.getPasswordResetRateLimit(),
            authValidators.requestPasswordReset(),
          ],
          schema: {
            description: 'Solicitar reset de senha',
            tags: ['Autenticação'],
            body: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },
        authController.requestPasswordReset
      );

      /**
       *  Rota para admin resetar a senha de um usuário
       */
      fastify.post(
        '/users/:id/reset-password-admin',
        {
          preHandler: [
            authMiddleware.authenticate(),
            // Usamos a permissão de UPDATE, pois é uma ação que modifica o estado do usuário
            authMiddleware.requirePermission(USER_PERMISSIONS.USER_UPDATE),
            authValidators.validateId(), // Reutiliza o validador de ID
          ],
          schema: {
            description: 'Forçar a redefinição de senha de um usuário (Admin)',
            tags: ['Administração'],
            security: [{ bearerAuth: [] }],
            params: z.object({
              id: z.string().uuid({ message: 'O ID do usuário deve ser um UUID válido.' }),
            }),
            response: {
              200: z.object({
                success: z.boolean(),
                message: z.string(),
              }),
            },
          },
        },
        authController.resetPasswordByAdmin
      );

      // Resetar senha
      fastify.post(
        '/password/reset',
        {
          preHandler: [rateLimiter.getPasswordResetRateLimit(), authValidators.resetPassword()],
          schema: {
            description: 'Resetar senha com token',
            tags: ['Autenticação'],
            // ✅ CORREÇÃO: Convertido para Zod
            body: z
              .object({
                token: z.string({ required_error: 'O token é obrigatório.' }),
                newPassword: z
                  .string()
                  .min(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' }),
                confirmPassword: z.string(),
              })
              .refine(data => data.newPassword === data.confirmPassword, {
                message: 'A confirmação de senha não confere com a nova senha.',
                path: ['confirmPassword'], // Indica qual campo está com o erro
              }),
          },
        },
        authController.resetPassword
      );

      // Verificar se email existe
      fastify.get(
        '/check/email',
        {
          preHandler: [authValidators.checkEmail()],
          schema: {
            description: 'Verificar se email já existe',
            tags: ['Autenticação'],
            querystring: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },
        authController.checkEmail
      );

      // Verificar se username existe
      fastify.get(
        '/check/username',
        {
          preHandler: [authValidators.checkUsername()],
          schema: {
            description: 'Verificar se username já existe',
            tags: ['Autenticação'],
            querystring: {
              type: 'object',
              required: ['username'],
              properties: {
                username: { type: 'string', minLength: 3, maxLength: 50 },
              },
            },
          },
        },
        authController.checkUsername
      );

      // ==========================================
      // 🔒 ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
      // ==========================================

      // Logout
      fastify.post(
        '/logout',
        {
          preHandler: [authMiddleware.authenticate(), authValidators.logout()],
          schema: {
            description: 'Fazer logout',
            tags: ['Autenticação'],
            security: [{ bearerAuth: [] }],
          },
        },
        authController.logout
      );

      // Obter perfil
      fastify.get(
        '/profile',
        {
          preHandler: [authMiddleware.authenticate()],
          schema: {
            description: 'Obter perfil do usuário logado',
            tags: ['Perfil'],
            security: [{ bearerAuth: [] }],
          },
        },
        authController.getProfile
      );

      // Atualizar perfil
      fastify.put(
        '/profile',
        {
          preHandler: [authMiddleware.authenticate(), authValidators.updateProfile()],
          schema: {
            description: 'Atualizar perfil do usuário logado',
            tags: ['Perfil'],
            security: [{ bearerAuth: [] }],
            body: {
              type: 'object',
              properties: {
                fullName: { type: 'string', minLength: 2, maxLength: 100 },
                username: { type: 'string', minLength: 3, maxLength: 50 },
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },
        authController.updateProfile
      );

      // Alterar senha
      fastify.put(
        '/password/change',
        {
          preHandler: [authMiddleware.authenticate(), authValidators.changePassword()],
          schema: {
            description: 'Alterar senha do usuário logado',
            tags: ['Autenticação'],
            security: [{ bearerAuth: [] }],
            body: {
              type: 'object',
              required: ['currentPassword', 'newPassword', 'confirmPassword'],
              properties: {
                currentPassword: { type: 'string' },
                newPassword: { type: 'string', minLength: 8 },
                confirmPassword: { type: 'string' },
              },
            },
          },
        },
        authController.changePassword
      );

      // ==========================================
      // 👑 ROTAS ADMINISTRATIVAS
      // ==========================================

      // Listar usuários (Admin)
      fastify.get(
        '/users',
        {
          preHandler: [
            authMiddleware.authenticate(),
            authMiddleware.requirePermission(USER_PERMISSIONS.USER_LIST),
            authValidators.listUsers(),
          ],
          schema: {
            description: 'Listar usuários (Admin)',
            tags: ['Administração'],
            security: [{ bearerAuth: [] }],
            querystring: {
              type: 'object',
              properties: {
                page: { type: 'integer', minimum: 1, default: 1 },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                search: { type: 'string', minLength: 2, maxLength: 100 },
                role: { type: 'string', enum: ['admin', 'user', 'moderator', 'viewer'] },
                status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending'] },
                sortBy: {
                  type: 'string',
                  enum: ['createdAt', 'updatedAt', 'email', 'username', 'fullName'],
                  default: 'createdAt',
                },
                sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
              },
            },
          },
        },
        authController.listUsers
      );

      // Obter usuário por ID (Admin)
      fastify.get(
        '/users/:id',
        {
          preHandler: [
            authMiddleware.authenticate(),
            authMiddleware.requirePermission(USER_PERMISSIONS.USER_READ),
            authValidators.validateId(),
          ],
          schema: {
            description: 'Obter usuário por ID (Admin)',
            tags: ['Administração'],
            security: [{ bearerAuth: [] }],
            params: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
        authController.getUserById
      );

      // Criar usuário (Admin)
      fastify.post(
        '/users',
        {
          preHandler: [
            authMiddleware.authenticate(),
            authMiddleware.requirePermission(USER_PERMISSIONS.USER_CREATE),
            // 2. REMOVER a validação duplicada com Joi
            // authValidators.createUser(),
          ],
          schema: {
            description: 'Criar usuário (Admin)',
            tags: ['Administração'],
            security: [{ bearerAuth: [] }],
            // 3. SUBSTITUIR o schema JSON por um schema Zod
            body: z.object({
              email: z.string().email({ message: 'Email inválido' }),
              username: z
                .string()
                .min(3, { message: 'Nome de usuário deve ter pelo menos 3 caracteres' }),
              fullName: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
              // 4. Deixar a senha opcional, como planejamos
              password: z
                .string()
                .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
                .optional(),
              role: z.enum(['admin', 'user', 'moderator', 'viewer']).default('user'),
              status: z.enum(['active', 'inactive', 'pending']).default('active'),
              sendWelcomeEmail: z.boolean().default(true),
            }),
            // Você também pode definir o schema de resposta com Zod para garantir consistência
            response: {
              201: z.object({
                success: z.boolean(),
                message: z.string(),
                data: z.object({
                  user: z.any(), // Defina a estrutura do usuário aqui se desejar
                  temporaryPassword: z.string().optional(),
                }),
              }),
            },
          },
        },
        authController.createUser
      );

      // Atualizar usuário (Admin)
      fastify.put(
        '/users/:id',
        {
          preHandler: [
            authMiddleware.authenticate(),
            authMiddleware.requirePermission(USER_PERMISSIONS.USER_UPDATE),
            authValidators.updateUser(),
          ],
          schema: {
            description: 'Atualizar usuário (Admin)',
            tags: ['Administração'],
            security: [{ bearerAuth: [] }],
            params: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string', format: 'uuid' },
              },
            },
            body: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                username: { type: 'string', minLength: 3, maxLength: 50 },
                fullName: { type: 'string', minLength: 2, maxLength: 100 },
                password: { type: 'string', minLength: 8 },
                role: { type: 'string', enum: ['admin', 'user', 'moderator', 'viewer'] },
                status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending'] },
              },
            },
          },
        },
        authController.updateUser
      );

      // Deletar usuário (Admin)
      fastify.delete(
        '/users/:id',
        {
          preHandler: [
            authMiddleware.authenticate(),
            authMiddleware.requirePermission(USER_PERMISSIONS.USER_DELETE),
            authValidators.validateId(),
          ],
          schema: {
            description: 'Deletar usuário (Admin)',
            tags: ['Administração'],
            security: [{ bearerAuth: [] }],
            params: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
        authController.deleteUser
      );
    },
    { prefix: '/auth' }
  );
}

export default authRoutes;
