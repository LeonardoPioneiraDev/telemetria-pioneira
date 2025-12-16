import { AppDataSource } from '@/data-source.js';
import { RequestLog } from '@/entities/request-log.entity.js';
import { logger } from '@/shared/utils/logger.js';
import { Repository } from 'typeorm';
import { RequestLogData } from '../types/metrics.types.js';

export class RequestLoggerService {
  private static instance: RequestLoggerService;
  private repository: Repository<RequestLog>;
  private isInitialized: boolean = false;

  private constructor() {
    this.repository = AppDataSource.getRepository(RequestLog);
  }

  public static getInstance(): RequestLoggerService {
    if (!RequestLoggerService.instance) {
      RequestLoggerService.instance = new RequestLoggerService();
    }
    return RequestLoggerService.instance;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized && AppDataSource.isInitialized) {
      this.repository = AppDataSource.getRepository(RequestLog);
      this.isInitialized = true;
    }
  }

  public async logRequest(data: RequestLogData): Promise<void> {
    try {
      this.ensureInitialized();

      const requestLog = this.repository.create({
        requestId: data.requestId,
        timestamp: data.timestamp,
        method: data.method,
        endpoint: data.endpoint,
        routePattern: data.routePattern,
        userId: data.userId,
        userRole: data.userRole,
        statusCode: data.statusCode,
        latencyMs: data.latencyMs,
        responseSizeBytes: data.responseSizeBytes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        errorMessage: data.errorMessage,
        errorCode: data.errorCode,
      });

      await this.repository.save(requestLog);
    } catch (error) {
      logger.error('Failed to log request metrics:', error);
    }
  }

  public async logRequestAsync(data: RequestLogData): Promise<void> {
    setImmediate(() => {
      this.logRequest(data).catch(err => {
        logger.error('Async request logging failed:', err);
      });
    });
  }
}

export const requestLoggerService = RequestLoggerService.getInstance();
