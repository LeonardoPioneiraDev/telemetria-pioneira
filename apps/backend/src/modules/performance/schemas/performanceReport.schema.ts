// apps/backend/src/modules/performance/schemas/performanceReport.schema.ts
import { z } from 'zod';

export const performanceReportParamsSchema = z.object({
  driverId: z.coerce.number().int().positive(),
});

export const performanceReportQuerySchema = z.object({
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  periodDays: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export const dateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const performanceReportResponseSchema = z.object({
  driverInfo: z.object({
    id: z.number(),
    name: z.string(),
    badge: z.string().nullable(),
  }),
  reportDetails: z.object({
    reportDateFormatted: z.string(),
    periodSummary: z.string(),
    acknowledgmentText: z.string(),
  }),
  performanceSummary: z.object({
    periods: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        date: z.string(),
      })
    ),
    metrics: z.array(
      z.object({
        eventType: z.string(),
        counts: z.record(z.string(), z.number()),
      })
    ),
    totalEvents: z.number(),
  }),
});
