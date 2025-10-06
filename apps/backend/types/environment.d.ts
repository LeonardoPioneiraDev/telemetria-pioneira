//apps/backend/types/environment.d.ts
export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  schema: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface AuthConfig {
  enabled: boolean;
  bcryptRounds: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  tls: boolean;
  startTls: boolean;
  ignoreTls: boolean;
}

export interface EmailConfig {
  enabled: boolean;
  debug: boolean;
  logErrors: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  smtp: SMTPConfig;
  from: {
    name: string;
    address: string;
  };
  templates: {
    dir: string;
    resetPasswordSubject: string;
    welcomeSubject: string;
    passwordChangedSubject: string;
  };
}

export interface CORSConfig {
  origin: string[];
  credentials: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  global: {
    ttl: number;
    limit: number;
  };
  auth: {
    ttl: number;
    limit: number;
  };
  passwordReset: {
    ttl: number;
    limit: number;
  };
}

export interface LogConfig {
  level: string;
  fileEnabled: boolean;
  toFile: boolean;
  toConsole: boolean;
  filePath: string;
  maxFiles: number;
  maxSize: string;
  enableMetrics: boolean;
  enableHealthCheck: boolean;
  debug: {
    database: boolean;
    auth: boolean;
    email: boolean;
    cache: boolean;
  };
  performance: {
    slowQueries: boolean;
    slowQueryThreshold: number;
    connections: boolean;
    errors: boolean;
    securityEvents: boolean;
  };
}

export interface EnvironmentConfig {
  NODE_ENV: string;
  HOST: string;
  PORT: number;
  database: DatabaseConfig;
  jwt: JWTConfig;
  auth: AuthConfig;
  email: EmailConfig;
  cors: CORSConfig;
  rateLimit: RateLimitConfig;
  log: LogConfig;
  swagger: {
    enabled: boolean;
  };
  admin: {
    autoCreate: boolean;
    username: string;
    email: string;
    password: string;
    fullName: string;
  };

  frontend: {
    url: string;
  };
  helmet: {
    enabled: boolean;
    cspEnabled: boolean;
    crossOriginEmbedderPolicy: boolean;
  };
  trustProxy: boolean;
  compression: {
    enabled: boolean;
    level: number;
  };
  api: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  healthCheck: {
    enabled: boolean;
    database: boolean;
    memory: boolean;
    disk: boolean;
  };
  cleanup: {
    enabled: boolean;
    intervalMinutes: number;
    expiredTokens: boolean;
    failedLoginAttempts: boolean;
  };
  dev: {
    seedDatabase: boolean;
    resetDatabase: boolean;
    createSampleUsers: boolean;
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string | undefined;
    db: number;
  };
  mixApi: {
    username: string;
    password: string;
    basicAuthToken: string;
    scope: string;
  };
}
