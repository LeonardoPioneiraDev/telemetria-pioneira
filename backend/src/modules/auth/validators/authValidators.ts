import Joi from 'joi';
import { validationMiddleware } from '../middleware/validationMiddleware.js';

const commonSchemas = validationMiddleware.getCommonSchemas();

export class AuthValidators {
  private static instance: AuthValidators;

  private constructor() {}

  public static getInstance(): AuthValidators {
    if (!AuthValidators.instance) {
      AuthValidators.instance = new AuthValidators();
    }
    return AuthValidators.instance;
  }

  /**
   * Validação para registro de usuário
   */
  public register() {
    return validationMiddleware.validate({
      body: Joi.object({
        email: commonSchemas.email,
        password: commonSchemas.password,
        username: commonSchemas.username,
        fullName: commonSchemas.name,
        acceptTerms: Joi.boolean()
          .valid(true)
          .required()
          .messages({
            'any.only': 'Você deve aceitar os termos de uso',
            'any.required': 'Aceitação dos termos é obrigatória'
          })
      })
    });
  }

  /**
   * Validação para login
   */
  public login() {
    return validationMiddleware.validate({
      body: Joi.object({
        email: commonSchemas.email,
        password: Joi.string()
          .required()
          .messages({
            'any.required': 'Senha é obrigatória'
          }),
        rememberMe: Joi.boolean().default(false)
      })
    });
  }

  /**
   * Validação para refresh token
   */
  public refreshToken() {
    return validationMiddleware.validate({
      body: Joi.object({
        refreshToken: commonSchemas.token
      })
    });
  }

  /**
   * Validação para solicitação de reset de senha
   */
  public requestPasswordReset() {
    return validationMiddleware.validate({
      body: Joi.object({
        email: commonSchemas.email
      })
    });
  }

  /**
   * Validação para reset de senha
   */
  public resetPassword() {
    return validationMiddleware.validate({
      body: Joi.object({
        token: commonSchemas.token,
        newPassword: commonSchemas.password,
        confirmPassword: Joi.string()
          .valid(Joi.ref('newPassword'))
          .required()
          .messages({
            'any.only': 'Confirmação de senha deve ser igual à nova senha',
            'any.required': 'Confirmação de senha é obrigatória'
          })
      })
    });
  }

  /**
   * Validação para alteração de senha
   */
  public changePassword() {
    return validationMiddleware.validate({
      body: Joi.object({
        currentPassword: Joi.string()
          .required()
          .messages({
            'any.required': 'Senha atual é obrigatória'
          }),
        newPassword: commonSchemas.password,
        confirmPassword: Joi.string()
          .valid(Joi.ref('newPassword'))
          .required()
          .messages({
            'any.only': 'Confirmação de senha deve ser igual à nova senha',
            'any.required': 'Confirmação de senha é obrigatória'
          })
      })
    });
  }

  /**
   * Validação para atualização de perfil
   */
  public updateProfile() {
    return validationMiddleware.validate({
      body: Joi.object({
        fullName: commonSchemas.name.optional(),
        username: commonSchemas.username.optional(),
        email: commonSchemas.email.optional()
      }).min(1).messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
      })
    });
  }

  /**
   * Validação para parâmetros de ID
   */
  public validateId() {
    return validationMiddleware.validate({
      params: Joi.object({
        id: commonSchemas.id
      })
    });
  }

  /**
   * Validação para listagem de usuários
   */
  public listUsers() {
    return validationMiddleware.validate({
      query: Joi.object({
        page: commonSchemas.pagination.page,
        limit: commonSchemas.pagination.limit,
        search: Joi.string()
          .min(2)
          .max(100)
          .trim()
          .optional()
          .messages({
            'string.min': 'Busca deve ter pelo menos 2 caracteres',
            'string.max': 'Busca deve ter no máximo 100 caracteres'
          }),
        role: Joi.string()
          .valid('admin', 'user', 'moderator', 'viewer')
          .optional(),
        status: Joi.string()
          .valid('active', 'inactive', 'suspended', 'pending')
          .optional(),
        sortBy: Joi.string()
          .valid('createdAt', 'updatedAt', 'email', 'username', 'fullName')
          .default('createdAt'),
        sortOrder: Joi.string()
          .valid('asc', 'desc')
          .default('desc')
      })
    });
  }

  /**
   * Validação para criação de usuário (admin)
   */
  public createUser() {
    return validationMiddleware.validate({
      body: Joi.object({
        email: commonSchemas.email,
        username: commonSchemas.username,
        fullName: commonSchemas.name,
        password: commonSchemas.password,
        role: Joi.string()
          .valid('admin', 'user', 'moderator', 'viewer')
          .default('user'),
        status: Joi.string()
          .valid('active', 'inactive', 'pending')
          .default('active'),
        sendWelcomeEmail: Joi.boolean().default(true)
      })
    });
  }

  /**
   * Validação para atualização de usuário (admin)
   */
  public updateUser() {
    return validationMiddleware.validate({
      params: Joi.object({
        id: commonSchemas.id
      }),
      body: Joi.object({
        email: commonSchemas.email.optional(),
        username: commonSchemas.username.optional(),
        fullName: commonSchemas.name.optional(),
        role: Joi.string()
          .valid('admin', 'user', 'moderator', 'viewer')
          .optional(),
        status: Joi.string()
          .valid('active', 'inactive', 'suspended', 'pending')
          .optional(),
        password: commonSchemas.optionalPassword
      }).min(1).messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
      })
    });
  }

  /**
   * Validação para verificação de email
   */
  public verifyEmail() {
    return validationMiddleware.validate({
      body: Joi.object({
        token: commonSchemas.token
      })
    });
  }

  /**
   * Validação para reenvio de email de verificação
   */
  public resendVerificationEmail() {
    return validationMiddleware.validate({
      body: Joi.object({
        email: commonSchemas.email
      })
    });
  }

  /**
   * Validação para logout
   */
  public logout() {
    return validationMiddleware.validate({
      body: Joi.object({
        refreshToken: commonSchemas.token.optional()
      })
    });
  }

  /**
   * Validação para validação de username
   */
  public checkUsername() {
    return validationMiddleware.validate({
      query: Joi.object({
        username: commonSchemas.username
      })
    });
  }

  /**
   * Validação para validação de email
   */
  public checkEmail() {
    return validationMiddleware.validate({
      query: Joi.object({
        email: commonSchemas.email
      })
    });
  }

  /**
   * Validação para headers de autenticação
   */
  public validateAuthHeaders() {
    return validationMiddleware.validate({
      headers: Joi.object({
        authorization: Joi.string()
          .pattern(/^Bearer .+/)
          .required()
          .messages({
            'string.pattern.base': 'Header Authorization deve estar no formato "Bearer <token>"',
            'any.required': 'Header Authorization é obrigatório'
          })
      }).unknown(true)
    });
  }
}

export const authValidators = AuthValidators.getInstance();
export default authValidators;