export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
  VIEWER: 'viewer',
} as const;

export const USER_PERMISSIONS = {
  // Usuários
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',

  // Perfil próprio
  PROFILE_READ: 'profile:read',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',

  // Autenticação
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_REFRESH: 'auth:refresh',
  AUTH_RESET_PASSWORD: 'auth:reset-password',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',

  // Sistema
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_METRICS: 'system:metrics',

  // Admin
  ADMIN_PANEL: 'admin:panel',
  ADMIN_USERS: 'admin:users',
  ADMIN_SETTINGS: 'admin:settings',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    USER_PERMISSIONS.USER_CREATE,
    USER_PERMISSIONS.USER_READ,
    USER_PERMISSIONS.USER_UPDATE,
    USER_PERMISSIONS.USER_DELETE,
    USER_PERMISSIONS.USER_LIST,
    USER_PERMISSIONS.PROFILE_READ,
    USER_PERMISSIONS.PROFILE_UPDATE,
    USER_PERMISSIONS.PROFILE_DELETE,
    USER_PERMISSIONS.AUTH_LOGIN,
    USER_PERMISSIONS.AUTH_LOGOUT,
    USER_PERMISSIONS.AUTH_REFRESH,
    USER_PERMISSIONS.AUTH_RESET_PASSWORD,
    USER_PERMISSIONS.AUTH_CHANGE_PASSWORD,
    USER_PERMISSIONS.SYSTEM_HEALTH,
    USER_PERMISSIONS.SYSTEM_LOGS,
    USER_PERMISSIONS.SYSTEM_METRICS,
    USER_PERMISSIONS.ADMIN_PANEL,
    USER_PERMISSIONS.ADMIN_USERS,
    USER_PERMISSIONS.ADMIN_SETTINGS,
  ],
  [USER_ROLES.MODERATOR]: [
    USER_PERMISSIONS.USER_READ,
    USER_PERMISSIONS.USER_UPDATE,
    USER_PERMISSIONS.USER_LIST,
    USER_PERMISSIONS.PROFILE_READ,
    USER_PERMISSIONS.PROFILE_UPDATE,
    USER_PERMISSIONS.AUTH_LOGIN,
    USER_PERMISSIONS.AUTH_LOGOUT,
    USER_PERMISSIONS.AUTH_REFRESH,
    USER_PERMISSIONS.AUTH_RESET_PASSWORD,
    USER_PERMISSIONS.AUTH_CHANGE_PASSWORD,
    USER_PERMISSIONS.SYSTEM_HEALTH,
  ],
  [USER_ROLES.USER]: [
    USER_PERMISSIONS.PROFILE_READ,
    USER_PERMISSIONS.PROFILE_UPDATE,
    USER_PERMISSIONS.AUTH_LOGIN,
    USER_PERMISSIONS.AUTH_LOGOUT,
    USER_PERMISSIONS.AUTH_REFRESH,
    USER_PERMISSIONS.AUTH_RESET_PASSWORD,
    USER_PERMISSIONS.AUTH_CHANGE_PASSWORD,
  ],
  [USER_ROLES.VIEWER]: [
    USER_PERMISSIONS.PROFILE_READ,
    USER_PERMISSIONS.AUTH_LOGIN,
    USER_PERMISSIONS.AUTH_LOGOUT,
    USER_PERMISSIONS.AUTH_REFRESH,
  ],
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET_PASSWORD: 'reset_password',
  EMAIL_VERIFICATION: 'email_verification',
} as const;

export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  RESET_PASSWORD: 'resetPassword',
  PASSWORD_CHANGED: 'passwordChanged',
  EMAIL_VERIFICATION: 'emailVerification',
  ACCOUNT_SUSPENDED: 'accountSuspended',
  ACCOUNT_ACTIVATED: 'accountActivated',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  // Autenticação
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',

  // Autorização
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // Usuário
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_SUSPENDED: 'USER_SUSPENDED',

  // Senha
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  PASSWORD_SAME_AS_CURRENT: 'PASSWORD_SAME_AS_CURRENT',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_LOGIN_ATTEMPTS: 'TOO_MANY_LOGIN_ATTEMPTS',

  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Sistema
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_SEND_ERROR: 'EMAIL_SEND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo é obrigatório',
  EMAIL_INVALID: 'Email inválido',
  PASSWORD_MIN_LENGTH: 'A senha deve ter pelo menos {min} caracteres',
  PASSWORD_UPPERCASE: 'A senha deve conter pelo menos uma letra maiúscula',
  PASSWORD_LOWERCASE: 'A senha deve conter pelo menos uma letra minúscula',
  PASSWORD_NUMBER: 'A senha deve conter pelo menos um número',
  PASSWORD_SYMBOL: 'A senha deve conter pelo menos um símbolo especial',
  USERNAME_MIN_LENGTH: 'O nome de usuário deve ter pelo menos 3 caracteres',
  USERNAME_MAX_LENGTH: 'O nome de usuário deve ter no máximo 50 caracteres',
  NAME_MIN_LENGTH: 'O nome deve ter pelo menos 2 caracteres',
  NAME_MAX_LENGTH: 'O nome deve ter no máximo 100 caracteres',
} as const;

export const RATE_LIMIT_WINDOWS = {
  GLOBAL: 60 * 1000, // 1 minuto
  AUTH: 15 * 60 * 1000, // 15 minutos
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hora
  EMAIL_SEND: 5 * 60 * 1000, // 5 minutos
} as const;

export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  FAILED_LOGIN_ATTEMPTS: (identifier: string) => `failed_login:${identifier}`,
  RESET_TOKEN: (token: string) => `reset_token:${token}`,
  REFRESH_TOKEN: (userId: string) => `refresh_token:${userId}`,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const PASSWORD_RESET = {
  TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hora
  MAX_ATTEMPTS: 3,
  COOLDOWN: 15 * 60 * 1000, // 15 minutos
} as const;

export const SESSION = {
  MAX_CONCURRENT_SESSIONS: 5,
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hora
  INACTIVE_TIMEOUT: 30 * 60 * 1000, // 30 minutos
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type UserPermission = (typeof USER_PERMISSIONS)[keyof typeof USER_PERMISSIONS];
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
