import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authValidators } from '../validators/authValidators.js';
import { rateLimiter } from '../../../shared/middleware/rateLimiter.js';
import { USER_PERMISSIONS } from '../../../shared/constants/index.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Prefixo para todas as rotas de autenticação
  await fastify.register(async function (fastify) {
    // ==========================================
    // 🔓 ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
    // ==========================================

    // Registro de usuário
    fastify.post('/register', {
      preHandler: [
        rateLimiter.getAuthRateLimit(),
        authValidators.register()
      ],
      schema: {
        description: 'Registrar novo usuário',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email', 'username', 'fullName', 'password', 'acceptTerms'],
          properties: {
            email: { type: 'string', format: 'email', description: 'Email do usuário' },
            username: { type: 'string', minLength: 3, maxLength: 50, description: 'Nome de usuário único' },
            fullName: { type: 'string', minLength: 2, maxLength: 100, description: 'Nome completo' },
            password: { type: 'string', minLength: 8, description: 'Senha forte' },
            acceptTerms: { type: 'boolean', const: true, description: 'Aceitar termos de uso' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  username: { type: 'string' },
                  fullName: { type: 'string' },
                  role: { type: 'string' },
                  status: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                  createdAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }, authController.register);

    // Login
    fastify.post('/login', {
      preHandler: [
        rateLimiter.getAuthRateLimit(),
        authValidators.login()
      ],
      schema: {
        description: 'Fazer login',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            rememberMe: { type: 'boolean', default: false }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }, authController.login);

    // Renovar token
    fastify.post('/refresh', {
      preHandler: [authValidators.refreshToken()],
      schema: {
        description: 'Renovar token de acesso',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' }
          }
        }
      }
    }, authController.refreshToken);

    // Solicitar reset de senha
    fastify.post('/password/reset-request', {
      preHandler: [
        rateLimiter.getPasswordResetRateLimit(),
        authValidators.requestPasswordReset()
      ],
      schema: {
        description: 'Solicitar reset de senha',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        }
      }
    }, authController.requestPasswordReset);

    // Resetar senha
    fastify.post('/password/reset', {
      preHandler: [
        rateLimiter.getPasswordResetRateLimit(),
        authValidators.resetPassword()
      ],
      schema: {
        description: 'Resetar senha com token',
        tags: ['Autenticação'],
        body: {
          type: 'object',
          required: ['token', 'newPassword', 'confirmPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string' }
          }
        }
      }
    }, authController.resetPassword);

    // Verificar se email existe
    fastify.get('/check/email', {
      preHandler: [authValidators.checkEmail()],
      schema: {
        description: 'Verificar se email já existe',
        tags: ['Autenticação'],
        querystring: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        }
      }
    }, authController.checkEmail);

    // Verificar se username existe
    fastify.get('/check/username', {
      preHandler: [authValidators.checkUsername()],
      schema: {
        description: 'Verificar se username já existe',
        tags: ['Autenticação'],
        querystring: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 }
          }
        }
      }
    }, authController.checkUsername);

    // ==========================================
    // 🔒 ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
    // ==========================================

    // Logout
    fastify.post('/logout', {
      preHandler: [
        authMiddleware.authenticate(),
        authValidators.logout()
      ],
      schema: {
        description: 'Fazer logout',
        tags: ['Autenticação'],
        security: [{ bearerAuth: [] }]
      }
    }, authController.logout);

    // Obter perfil
    fastify.get('/profile', {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Obter perfil do usuário logado',
        tags: ['Perfil'],
        security: [{ bearerAuth: [] }]
      }
    }, authController.getProfile);

    // Atualizar perfil
    fastify.put('/profile', {
      preHandler: [
        authMiddleware.authenticate(),
        authValidators.updateProfile()
      ],
      schema: {
        description: 'Atualizar perfil do usuário logado',
        tags: ['Perfil'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            fullName: { type: 'string', minLength: 2, maxLength: 100 },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email: { type: 'string', format: 'email' }
          }
        }
      }
    }, authController.updateProfile);

    // Alterar senha
    fastify.put('/password/change', {
      preHandler: [
        authMiddleware.authenticate(),
        authValidators.changePassword()
      ],
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
            confirmPassword: { type: 'string' }
          }
        }
      }
    }, authController.changePassword);

    // ==========================================
    // 👑 ROTAS ADMINISTRATIVAS
    // ==========================================

    // Listar usuários (Admin)
    fastify.get('/users', {
      preHandler: [
        authMiddleware.authenticate(),
        authMiddleware.requirePermission(USER_PERMISSIONS.USER_LIST),
        authValidators.listUsers()
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
            sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'email', 'username', 'fullName'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          }
        }
      }
    }, authController.listUsers);

    // Obter usuário por ID (Admin)
    fastify.get('/users/:id', {
      preHandler: [
        authMiddleware.authenticate(),
        authMiddleware.requirePermission(USER_PERMISSIONS.USER_READ),
        authValidators.validateId()
      ],
      schema: {
        description: 'Obter usuário por ID (Admin)',
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    }, authController.getUserById);

    // Criar usuário (Admin)
    fastify.post('/users', {
      preHandler: [
        authMiddleware.authenticate(),
        authMiddleware.requirePermission(USER_PERMISSIONS.USER_CREATE),
        authValidators.createUser()
      ],
      schema: {
        description: 'Criar usuário (Admin)',
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'username', 'fullName', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            fullName: { type: 'string', minLength: 2, maxLength: 100 },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin', 'user', 'moderator', 'viewer'], default: 'user' },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'], default: 'active' },
            sendWelcomeEmail: { type: 'boolean', default: true }
          }
        }
      }
    }, authController.createUser);

    // Atualizar usuário (Admin)
    fastify.put('/users/:id', {
      preHandler: [
        authMiddleware.authenticate(),
        authMiddleware.requirePermission(USER_PERMISSIONS.USER_UPDATE),
        authValidators.updateUser()
      ],
      schema: {
        description: 'Atualizar usuário (Admin)',
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            fullName: { type: 'string', minLength: 2, maxLength: 100 },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin', 'user', 'moderator', 'viewer'] },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending'] }
          }
        }
      }
    }, authController.updateUser);

    // Deletar usuário (Admin)
    fastify.delete('/users/:id', {
      preHandler: [
        authMiddleware.authenticate(),
        authMiddleware.requirePermission(USER_PERMISSIONS.USER_DELETE),
        authValidators.validateId()
      ],
      schema: {
        description: 'Deletar usuário (Admin)',
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    }, authController.deleteUser);

  }, { prefix: '/auth' });
}

export default authRoutes;