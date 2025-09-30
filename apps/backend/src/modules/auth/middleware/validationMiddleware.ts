//apps/backend/src/modules/auth/middleware/validationMiddleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import Joi from 'joi';
import { environment } from '../../../config/environment.js';
import { logger } from '../../../shared/utils/logger.js';
import { responseHelper } from '../../../shared/utils/responseHelper.js';

export interface ValidationOptions {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

export class ValidationMiddleware {
  private static instance: ValidationMiddleware;

  private constructor() {}

  public static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  /**
   * Middleware principal de validação
   */
  public validate(options: ValidationOptions) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validationOptions = {
          abortEarly: options.abortEarly ?? false,
          allowUnknown: options.allowUnknown ?? false,
          stripUnknown: options.stripUnknown ?? true,
        };

        // Validar body
        if (options.body && request.body) {
          const { error, value } = options.body.validate(request.body, validationOptions);
          if (error) {
            return this.handleValidationError(error, reply, 'body');
          }
          request.body = value;
        }

        // Validar params
        if (options.params && request.params) {
          const { error, value } = options.params.validate(request.params, validationOptions);
          if (error) {
            return this.handleValidationError(error, reply, 'params');
          }
          request.params = value;
        }

        // Validar query
        if (options.query && request.query) {
          const { error, value } = options.query.validate(request.query, validationOptions);
          if (error) {
            return this.handleValidationError(error, reply, 'query');
          }
          request.query = value;
        }

        // Validar headers
        if (options.headers && request.headers) {
          const { error, value } = options.headers.validate(request.headers, validationOptions);
          if (error) {
            return this.handleValidationError(error, reply, 'headers');
          }
          // Não sobrescrever headers, apenas validar
        }

        logger.debug('Validação bem-sucedida', {
          url: request.url,
          method: request.method,
          hasBody: !!options.body,
          hasParams: !!options.params,
          hasQuery: !!options.query,
          hasHeaders: !!options.headers,
        });
      } catch (error) {
        logger.error('Erro na validação:', error);
        return responseHelper.serverError(reply, 'Erro interno na validação');
      }
    };
  }

  /**
   * Tratar erros de validação
   */
  private handleValidationError(
    error: Joi.ValidationError,
    reply: FastifyReply,
    source: string
  ): void {
    const errors = error.details.map(detail => {
      const field = detail.path.join('.');
      return `${source}.${field}: ${detail.message}`;
    });

    logger.warn('Erro de validação:', {
      source,
      errors,
      url: reply.request.url,
      method: reply.request.method,
    });

    responseHelper.validationError(reply, errors, `Dados inválidos em ${source}`);
  }

  /**
   * Schemas de validação comuns
   */
  public getCommonSchemas() {
    const passwordSchema = Joi.string()
      .min(environment.auth.password.minLength)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': `A senha deve ter pelo menos ${environment.auth.password.minLength} caracteres`,
        'string.pattern.base':
          'A senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 símbolo especial',
      });

    return {
      email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório',
      }),

      password: passwordSchema.required().messages({
        'any.required': 'Senha é obrigatória',
      }),

      optionalPassword: passwordSchema.optional(),

      username: Joi.string().alphanum().min(3).max(50).lowercase().trim().required().messages({
        'string.alphanum': 'Nome de usuário deve conter apenas letras e números',
        'string.min': 'Nome de usuário deve ter pelo menos 3 caracteres',
        'string.max': 'Nome de usuário deve ter no máximo 50 caracteres',
        'any.required': 'Nome de usuário é obrigatório',
      }),

      name: Joi.string().min(2).max(100).trim().required().messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório',
      }),

      id: Joi.string().uuid().required().messages({
        'string.uuid': 'ID deve ser um UUID válido',
        'any.required': 'ID é obrigatório',
      }),

      token: Joi.string().min(10).required().messages({
        'string.min': 'Token inválido',
        'any.required': 'Token é obrigatório',
      }),

      pagination: {
        page: Joi.number().integer().min(1).default(1).messages({
          'number.integer': 'Página deve ser um número inteiro',
          'number.min': 'Página deve ser maior que 0',
        }),

        limit: Joi.number().integer().min(1).max(100).default(10).messages({
          'number.integer': 'Limite deve ser um número inteiro',
          'number.min': 'Limite deve ser maior que 0',
          'number.max': 'Limite deve ser no máximo 100',
        }),
      },
    };
  }
}

export const validationMiddleware = ValidationMiddleware.getInstance();
export default validationMiddleware;
