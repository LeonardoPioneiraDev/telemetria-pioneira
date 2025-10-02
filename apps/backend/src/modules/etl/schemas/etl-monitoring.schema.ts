import { z } from 'zod';

// Schema para query de métricas
export const metricsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(30).default(7),
});

// Schema para query de histórico
export const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Schema de resposta do status
export const etlStatusResponseSchema = z.object({
  status: z.enum(['running', 'idle', 'error', 'circuit_breaker_open', 'unknown']),
  lastSync: z
    .object({
      token: z.string(),
      timestamp: z.string(),
      ageInMinutes: z.number(),
    })
    .nullable(),
  today: z.object({
    totalEvents: z.number(),
    totalPages: z.number(),
    eventsPerHour: z.number(),
    firstEventAt: z.string().nullable(),
    lastEventAt: z.string().nullable(),
  }),
  tokenInfo: z.object({
    current: z.string(),
    ageInHours: z.number(),
    isExpiringSoon: z.boolean(),
    expiresIn: z.string(),
    daysUntilExpiry: z.number(),
  }),
  workers: z.object({
    eventIngestion: z.object({
      active: z.number(),
      waiting: z.number(),
      completed: z.number(),
      failed: z.number(),
    }),
    masterDataSync: z.object({
      active: z.number(),
      waiting: z.number(),
      completed: z.number(),
      failed: z.number(),
    }),
  }),
  performance: z.object({
    avgEventsPerMinute: z.number(),
    totalEventsAllTime: z.number(),
    oldestEvent: z.string().nullable(),
    newestEvent: z.string().nullable(),
  }),
});

// Schema de resposta das métricas
export const etlMetricsResponseSchema = z.object({
  hourly: z.array(
    z.object({
      hour: z.string(),
      events: z.number(),
    })
  ),
  daily: z.array(
    z.object({
      date: z.string(),
      events: z.number(),
    })
  ),
  topEventTypes: z.array(
    z.object({
      eventTypeId: z.string(),
      count: z.number(),
    })
  ),
  topDrivers: z.array(
    z.object({
      driverId: z.string(),
      eventCount: z.number(),
    })
  ),
  topVehicles: z.array(
    z.object({
      vehicleId: z.string(),
      eventCount: z.number(),
    })
  ),
});

// Schema de resposta do histórico
export const etlHistoryResponseSchema = z.array(
  z.object({
    id: z.string().optional(),
    status: z.enum(['completed', 'failed']),
    processedOn: z.number().nullable(),
    finishedOn: z.number().nullable(),
    duration: z.number().nullable().optional(),
    returnValue: z.any().optional(),
    failedReason: z.string().optional(),
  })
);
