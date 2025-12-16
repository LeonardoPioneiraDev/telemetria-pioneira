import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { requestLoggerService } from '../services/request-logger.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    metricsStartTime?: number;
    metricsRequestId?: string;
  }
}

interface AuthenticatedUser {
  id?: string;
  role?: string;
}

const EXCLUDED_PATHS = ['/health', '/api/admin/metrics', '/docs', '/docs/'];

function shouldLogRequest(url: string): boolean {
  return !EXCLUDED_PATHS.some(path => url.startsWith(path));
}

export function registerRequestMetricsMiddleware(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.metricsStartTime = Date.now();
    request.metricsRequestId = uuidv4();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!shouldLogRequest(request.url)) {
      return;
    }

    const latencyMs = Date.now() - (request.metricsStartTime || Date.now());
    const user = request.user as AuthenticatedUser | undefined;

    requestLoggerService.logRequestAsync({
      requestId: request.metricsRequestId || uuidv4(),
      timestamp: new Date(),
      method: request.method,
      endpoint: request.url.split('?')[0],
      routePattern: request.routeOptions?.url || null,
      userId: user?.id || null,
      userRole: user?.role || null,
      statusCode: reply.statusCode,
      latencyMs,
      responseSizeBytes: null,
      ipAddress: request.ip || null,
      userAgent: request.headers['user-agent'] || null,
      errorMessage: null,
      errorCode: null,
    });
  });

  fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    if (!shouldLogRequest(request.url)) {
      return;
    }

    const latencyMs = Date.now() - (request.metricsStartTime || Date.now());
    const user = request.user as AuthenticatedUser | undefined;

    requestLoggerService.logRequestAsync({
      requestId: request.metricsRequestId || uuidv4(),
      timestamp: new Date(),
      method: request.method,
      endpoint: request.url.split('?')[0],
      routePattern: request.routeOptions?.url || null,
      userId: user?.id || null,
      userRole: user?.role || null,
      statusCode: 500,
      latencyMs,
      responseSizeBytes: null,
      ipAddress: request.ip || null,
      userAgent: request.headers['user-agent'] || null,
      errorMessage: error.message || null,
      errorCode: error.name || null,
    });
  });
}
