export interface EnvironmentConfig {
  NODE_ENV: string;
  HOST: string;
  PORT: number;

  database: {
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
  };

  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };

  auth: {
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
  };

  email: {
    enabled: boolean;
    debug: boolean;
    logErrors: boolean;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
      secure: boolean;
      tls: boolean;
      startTls: boolean;
      ignoreTls: boolean;
    };
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
  };

  cors: {
    origin: string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };

  rateLimit: {
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
  };

  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string | undefined;
    db: number;
  };

  log: {
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
  };

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

  mixApi: {
    username: string;
    password: string;
    basicAuthToken: string;
    scope: string;
  };
}
