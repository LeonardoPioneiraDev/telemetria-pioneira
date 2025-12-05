//apps/backend/src/config/environment.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import type { EnvironmentConfig } from '../../types/environment.js';

// Carregar o arquivo .env correto baseado no NODE_ENV
// O arquivo .env.production está na raiz do projeto (../../.env.production)
config({
  path:
    process.env.NODE_ENV === 'production'
      ? resolve(process.cwd(), '../../.env.production')
      : '.env',
});

export const environment: EnvironmentConfig = {
  // Ambiente
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT || '3333'),

  // Database
  database: {
    type: process.env.DATABASE_TYPE || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5435'),
    username: process.env.DATABASE_USERNAME || 'telemetria',
    password: process.env.DATABASE_PASSWORD || 'telemetria123',
    name: process.env.DATABASE_NAME || 'telemetriaPioneira_db',
    schema: process.env.DATABASE_SCHEMA || 'public',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'false',
    logging: process.env.DATABASE_LOGGING === 'true',
    ssl: process.env.DATABASE_SSL === 'true',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '18000000'),
    queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '18000000'),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'telemetria_secret_key_super_segura_2024_dev_environment',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'telemetria_refresh_secret_key_2024_dev_environment',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Auth
  auth: {
    enabled: process.env.AUTH_ENABLED !== 'false',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionTimeout: parseInt(process.env.AUTH_SESSION_TIMEOUT || '86400'),
    maxLoginAttempts: parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.AUTH_LOCKOUT_DURATION || '900'),
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false',
    },
  },

  // Email
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    debug: process.env.EMAIL_DEBUG === 'true',
    logErrors: process.env.EMAIL_LOG_ERRORS === 'true',
    timeout: parseInt(process.env.EMAIL_TIMEOUT || '60000'),
    retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '2000'),
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true',
      tls: process.env.SMTP_TLS === 'true',
      startTls: process.env.SMTP_STARTTLS === 'true',
      ignoreTls: process.env.SMTP_IGNORE_TLS === 'true',
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'telemetria Sistema',
      address: process.env.EMAIL_FROM_ADDRESS || '',
    },
    templates: {
      dir: process.env.EMAIL_TEMPLATE_DIR || 'src/templates/email',
      resetPasswordSubject:
        process.env.EMAIL_RESET_PASSWORD_SUBJECT || 'Recuperação de Senha - telemetria',
      welcomeSubject: process.env.EMAIL_WELCOME_SUBJECT || 'Bem-vindo ao telemetria',
      passwordChangedSubject:
        process.env.EMAIL_PASSWORD_CHANGED_SUBJECT || 'Senha Alterada - telemetria',
    },
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
      : ['http://localhost:3000'], // fallback
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    global: {
      ttl: parseInt(process.env.RATE_LIMIT_GLOBAL_TTL || '60000'),
      limit: parseInt(process.env.RATE_LIMIT_GLOBAL_LIMIT || '300'),
    },
    auth: {
      ttl: parseInt(process.env.RATE_LIMIT_AUTH_TTL || '18000000'),
      limit: parseInt(process.env.RATE_LIMIT_AUTH_LIMIT || '5'),
    },
    passwordReset: {
      ttl: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_TTL || '3600000'),
      limit: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_LIMIT || '10'),
    },
  },

  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // Logs
  log: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    toFile: process.env.LOG_TO_FILE === 'true',
    toConsole: process.env.LOG_TO_CONSOLE !== 'false',
    filePath: process.env.LOG_FILE_PATH || 'logs/telemetria.log',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === 'true',
    debug: {
      database: process.env.DEBUG_DATABASE === 'true',
      auth: process.env.DEBUG_AUTH === 'true',
      email: process.env.DEBUG_EMAIL === 'true',
      cache: process.env.DEBUG_CACHE === 'true',
    },
    performance: {
      slowQueries: process.env.LOG_SLOW_QUERIES === 'true',
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
      connections: process.env.LOG_CONNECTIONS === 'true',
      errors: process.env.LOG_ERRORS === 'true',
      securityEvents: process.env.LOG_SECURITY_EVENTS === 'true',
    },
  },

  // Swagger
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },

  // Admin
  admin: {
    autoCreate: process.env.AUTO_CREATE_ADMIN === 'true',
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    fullName: process.env.ADMIN_FULL_NAME || 'Administrator',
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Helmet
  helmet: {
    enabled: process.env.HELMET_ENABLED === 'true',
    cspEnabled: process.env.HELMET_CSP_ENABLED === 'true',
    crossOriginEmbedderPolicy: process.env.HELMET_CROSS_ORIGIN_EMBEDDER_POLICY === 'true',
  },

  // Trust Proxy
  trustProxy: process.env.TRUST_PROXY === 'true',

  // Compression
  compression: {
    enabled: process.env.COMPRESSION_ENABLED === 'true',
    level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
  },

  // API
  api: {
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000'),
  },

  // Health Check
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    database: process.env.HEALTH_CHECK_DATABASE === 'true',
    memory: process.env.HEALTH_CHECK_MEMORY === 'true',
    disk: process.env.HEALTH_CHECK_DISK === 'true',
  },

  // Cleanup
  cleanup: {
    enabled: process.env.CLEANUP_ENABLED === 'true',
    intervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60'),
    expiredTokens: process.env.CLEANUP_EXPIRED_TOKENS === 'true',
    failedLoginAttempts: process.env.CLEANUP_FAILED_LOGIN_ATTEMPTS === 'true',
  },

  // Development
  dev: {
    seedDatabase: process.env.DEV_SEED_DATABASE === 'true',
    resetDatabase: process.env.DEV_RESET_DATABASE === 'true',
    createSampleUsers: process.env.DEV_CREATE_SAMPLE_USERS === 'true',
  },
  mixApi: {
    username: process.env.MIX_USERNAME || '',
    password: process.env.MIX_PASSWORD || '',
    basicAuthToken: process.env.MIX_BASIC_AUTH_TOKEN || '',
    scope: process.env.MIX_SCOPE || 'offline_access MiX.Integrate',
  },
};

// Validação de variáveis obrigatórias
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_HOST',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `❌ Variáveis de ambiente obrigatórias não encontradas: ${missingEnvVars.join(', ')}`
  );
}

export default environment;
