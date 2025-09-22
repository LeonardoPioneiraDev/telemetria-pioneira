import winston from 'winston';
import { environment } from '../../config/environment.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Criar diretório de logs se não existir
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Formato para console (mais limpo)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Configuração dos transports
const transports: winston.transport[] = [];

// Transport para console
if (environment.log.toConsole) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: environment.log.level
    })
  );
}

// Transport para arquivo
if (environment.log.toFile && environment.log.fileEnabled) {
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: parseInt(environment.log.maxFiles.toString())
    }),
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: parseInt(environment.log.maxFiles.toString())
    })
  );
}

// Criar logger
export const logger = winston.createLogger({
  level: environment.log.level,
  format: customFormat,
  transports,
  exitOnError: false
});

// Métodos específicos para diferentes tipos de log
export const authLogger = {
  info: (message: string, meta?: any) => {
    if (environment.log.debug.auth) {
      logger.info(`[AUTH] ${message}`, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (environment.log.debug.auth) {
      logger.warn(`[AUTH] ${message}`, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (environment.log.debug.auth) {
      logger.error(`[AUTH] ${message}`, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    if (environment.log.debug.auth) {
      logger.debug(`[AUTH] ${message}`, meta);
    }
  }
};

export const databaseLogger = {
  info: (message: string, meta?: any) => {
    if (environment.log.debug.database) {
      logger.info(`[DATABASE] ${message}`, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (environment.log.debug.database) {
      logger.warn(`[DATABASE] ${message}`, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (environment.log.debug.database) {
      logger.error(`[DATABASE] ${message}`, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    if (environment.log.debug.database) {
      logger.debug(`[DATABASE] ${message}`, meta);
    }
  }
};

export const emailLogger = {
  info: (message: string, meta?: any) => {
    if (environment.log.debug.email) {
      logger.info(`[EMAIL] ${message}`, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (environment.log.debug.email) {
      logger.warn(`[EMAIL] ${message}`, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (environment.log.debug.email) {
      logger.error(`[EMAIL] ${message}`, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    if (environment.log.debug.email) {
      logger.debug(`[EMAIL] ${message}`, meta);
    }
  }
};

export const securityLogger = {
  info: (message: string, meta?: any) => {
    if (environment.log.performance.securityEvents) {
      logger.info(`[SECURITY] ${message}`, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (environment.log.performance.securityEvents) {
      logger.warn(`[SECURITY] ${message}`, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (environment.log.performance.securityEvents) {
      logger.error(`[SECURITY] ${message}`, meta);
    }
  }
};

// Interceptar erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('❌ Exceção não tratada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promise rejeitada não tratada:', { reason, promise });
});

export default logger;