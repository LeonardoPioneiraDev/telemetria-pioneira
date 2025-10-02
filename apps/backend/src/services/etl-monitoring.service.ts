import { environment } from '@/config/environment.js';
import { AppDataSource } from '@/data-source.js';
import { EtlControl } from '@/entities/etl-control.entity.js';
import { TelemetryEvent } from '@/entities/telemetry-event.entity.js';
import { logger } from '@/shared/utils/logger.js';
import { Queue } from 'bullmq';

interface ETLStatus {
  status: 'running' | 'idle' | 'error' | 'circuit_breaker_open' | 'unknown';
  lastSync: {
    token: string;
    timestamp: Date;
    ageInMinutes: number;
  } | null;
  today: {
    totalEvents: number;
    totalPages: number;
    eventsPerHour: number;
    firstEventAt: Date | null;
    lastEventAt: Date | null;
  };
  tokenInfo: {
    current: string;
    ageInHours: number;
    isExpiringSoon: boolean;
    expiresIn: string;
    daysUntilExpiry: number;
  };
  workers: {
    eventIngestion: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
    };
    masterDataSync: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
    };
  };
  performance: {
    avgEventsPerMinute: number;
    totalEventsAllTime: number;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  };
}

interface ETLMetrics {
  hourly: {
    hour: string;
    events: number;
  }[];
  daily: {
    date: string;
    events: number;
  }[];
  topEventTypes: {
    eventTypeId: string;
    count: number;
  }[];
  topDrivers: {
    driverId: string;
    eventCount: number;
  }[];
  topVehicles: {
    vehicleId: string;
    eventCount: number;
  }[];
}

export class EtlMonitoringService {
  private eventIngestionQueue: Queue;
  private masterDataQueue: Queue;

  constructor() {
    const connection = {
      host: environment.redis.host,
      port: environment.redis.port,
    };

    this.eventIngestionQueue = new Queue('event-ingestion', { connection });
    this.masterDataQueue = new Queue('master-data-sync', { connection });
  }

  /**
   * Retorna o status completo do ETL
   */
  async getStatus(): Promise<ETLStatus> {
    try {
      const [lastSync, todayStats, tokenInfo, workersInfo, performance] = await Promise.all([
        this._getLastSync(),
        this._getTodayStats(),
        this._getTokenInfo(),
        this._getWorkersInfo(),
        this._getPerformanceStats(),
      ]);

      // Determina o status geral
      let status: ETLStatus['status'] = 'unknown';

      if (workersInfo.eventIngestion.active > 0) {
        status = 'running';
      } else if (workersInfo.eventIngestion.failed > 0) {
        status = 'error';
      } else {
        status = 'idle';
      }

      return {
        status,
        lastSync,
        today: todayStats,
        tokenInfo,
        workers: workersInfo,
        performance,
      };
    } catch (error) {
      logger.error('Erro ao obter status do ETL:', error);
      throw error;
    }
  }

  /**
   * Retorna métricas detalhadas do ETL
   */
  async getMetrics(days: number = 7): Promise<ETLMetrics> {
    try {
      const telemetryRepo = AppDataSource.getRepository(TelemetryEvent);

      // Eventos por hora (últimas 24h)
      const hourlyQuery = await telemetryRepo
        .createQueryBuilder('event')
        .select("DATE_TRUNC('hour', event.event_timestamp)", 'hour')
        .addSelect('COUNT(*)', 'events')
        .where("event.event_timestamp >= NOW() - INTERVAL '24 hours'")
        .groupBy('hour')
        .orderBy('hour', 'ASC')
        .getRawMany();

      // Eventos por dia (últimos N dias)
      const dailyQuery = await telemetryRepo
        .createQueryBuilder('event')
        .select("DATE_TRUNC('day', event.event_timestamp)", 'date')
        .addSelect('COUNT(*)', 'events')
        .where(`event.event_timestamp >= NOW() - INTERVAL '${days} days'`)
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      // Top 10 tipos de evento
      const topEventTypesQuery = await telemetryRepo
        .createQueryBuilder('event')
        .select('event.event_type_external_id', 'eventTypeId')
        .addSelect('COUNT(*)', 'count')
        .where("event.created_at >= NOW() - INTERVAL '7 days'")
        .groupBy('event.event_type_external_id')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      // Top 10 motoristas
      const topDriversQuery = await telemetryRepo
        .createQueryBuilder('event')
        .select('event.driver_external_id', 'driverId')
        .addSelect('COUNT(*)', 'event_count')
        .where("event.created_at >= NOW() - INTERVAL '7 days'")
        .andWhere('event.driver_external_id IS NOT NULL')
        .groupBy('event.driver_external_id')
        .orderBy('event_count', 'DESC')
        .limit(10)
        .getRawMany();

      // Top 10 veículos
      const topVehiclesQuery = await telemetryRepo
        .createQueryBuilder('event')
        .select('event.vehicle_external_id', 'vehicleId')
        .addSelect('COUNT(*)', 'event_count')
        .where("event.created_at >= NOW() - INTERVAL '7 days'")
        .andWhere('event.vehicle_external_id IS NOT NULL')
        .groupBy('event.vehicle_external_id')
        .orderBy('event_count', 'DESC')
        .limit(10)
        .getRawMany();

      return {
        hourly: hourlyQuery.map(row => ({
          hour: row.hour,
          events: parseInt(row.events),
        })),
        daily: dailyQuery.map(row => ({
          date: row.date,
          events: parseInt(row.events),
        })),
        topEventTypes: topEventTypesQuery.map(row => ({
          eventTypeId: row.eventTypeId?.toString() || 'unknown',
          count: parseInt(row.count),
        })),
        topDrivers: topDriversQuery.map(row => ({
          driverId: row.driverId?.toString() || 'unknown',
          eventCount: parseInt(row.event_count),
        })),
        topVehicles: topVehiclesQuery.map(row => ({
          vehicleId: row.vehicleId?.toString() || 'unknown',
          eventCount: parseInt(row.event_count),
        })),
      };
    } catch (error) {
      logger.error('Erro ao obter métricas do ETL:', error);
      throw error;
    }
  }

  /**
   * Retorna o histórico de execuções (últimos N jobs)
   */
  async getHistory(limit: number = 20): Promise<any[]> {
    try {
      const completed = await this.eventIngestionQueue.getCompleted(0, limit);
      const failed = await this.eventIngestionQueue.getFailed(0, limit);

      const history = [
        ...completed.map(job => ({
          id: job.id,
          status: 'completed',
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          duration: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : null,
          returnValue: job.returnvalue,
        })),
        ...failed.map(job => ({
          id: job.id,
          status: 'failed',
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
        })),
      ].sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0));

      return history.slice(0, limit);
    } catch (error) {
      logger.error('Erro ao obter histórico do ETL:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async _getLastSync() {
    const etlControlRepo = AppDataSource.getRepository(EtlControl);
    const control = await etlControlRepo.findOne({
      where: { process_name: 'event_ingestion' },
    });

    if (!control) return null;

    const ageInMinutes = Math.floor(
      (Date.now() - control.last_run_timestamp.getTime()) / 1000 / 60
    );

    return {
      token: control.last_successful_sincetoken,
      timestamp: control.last_run_timestamp,
      ageInMinutes,
    };
  }

  private async _getTodayStats() {
    const telemetryRepo = AppDataSource.getRepository(TelemetryEvent);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const stats = await telemetryRepo
      .createQueryBuilder('event')
      .select('COUNT(*)', 'totalEvents')
      .addSelect('MIN(event.created_at)', 'firstEventAt')
      .addSelect('MAX(event.created_at)', 'lastEventAt')
      .where('event.created_at >= :todayStart', { todayStart })
      .getRawOne();

    const totalEvents = parseInt(stats.totalEvents) || 0;
    const hoursSinceStart = stats.firstEventAt
      ? (Date.now() - new Date(stats.firstEventAt).getTime()) / 1000 / 60 / 60
      : 24;
    const eventsPerHour = hoursSinceStart > 0 ? Math.round(totalEvents / hoursSinceStart) : 0;

    // Estimar total de páginas (assumindo ~120 eventos por página)
    const totalPages = Math.ceil(totalEvents / 120);

    return {
      totalEvents,
      totalPages,
      eventsPerHour,
      firstEventAt: stats.firstEventAt ? new Date(stats.firstEventAt) : null,
      lastEventAt: stats.lastEventAt ? new Date(stats.lastEventAt) : null,
    };
  }

  private async _getTokenInfo() {
    const etlControlRepo = AppDataSource.getRepository(EtlControl);
    const control = await etlControlRepo.findOne({
      where: { process_name: 'event_ingestion' },
    });

    if (!control) {
      return {
        current: 'N/A',
        ageInHours: 0,
        isExpiringSoon: true,
        expiresIn: 'Unknown',
        daysUntilExpiry: 0,
      };
    }

    const token = control.last_successful_sincetoken;

    // Parse do token: YYYYMMDDHHMMSSMMM
    const year = parseInt(token.substring(0, 4));
    const month = parseInt(token.substring(4, 6)) - 1;
    const day = parseInt(token.substring(6, 8));
    const hour = parseInt(token.substring(8, 10));
    const minute = parseInt(token.substring(10, 12));
    const second = parseInt(token.substring(12, 14));

    const tokenDate = new Date(year, month, day, hour, minute, second);
    const now = new Date();

    const ageInHours = (now.getTime() - tokenDate.getTime()) / 1000 / 60 / 60;
    const daysUntilExpiry = 7 - ageInHours / 24;
    const isExpiringSoon = daysUntilExpiry < 1; // Menos de 24h para expirar

    const expiresIn =
      daysUntilExpiry >= 1
        ? `${Math.floor(daysUntilExpiry)} dias`
        : `${Math.floor(daysUntilExpiry * 24)} horas`;

    return {
      current: token,
      ageInHours: Math.round(ageInHours * 10) / 10, // 1 casa decimal
      isExpiringSoon,
      expiresIn,
      daysUntilExpiry: Math.round(daysUntilExpiry * 10) / 10,
    };
  }

  private async _getWorkersInfo() {
    const [
      eventActive,
      eventWaiting,
      eventCompleted,
      eventFailed,
      masterActive,
      masterWaiting,
      masterCompleted,
      masterFailed,
    ] = await Promise.all([
      this.eventIngestionQueue.getActiveCount(),
      this.eventIngestionQueue.getWaitingCount(),
      this.eventIngestionQueue.getCompletedCount(),
      this.eventIngestionQueue.getFailedCount(),
      this.masterDataQueue.getActiveCount(),
      this.masterDataQueue.getWaitingCount(),
      this.masterDataQueue.getCompletedCount(),
      this.masterDataQueue.getFailedCount(),
    ]);

    return {
      eventIngestion: {
        active: eventActive,
        waiting: eventWaiting,
        completed: eventCompleted,
        failed: eventFailed,
      },
      masterDataSync: {
        active: masterActive,
        waiting: masterWaiting,
        completed: masterCompleted,
        failed: masterFailed,
      },
    };
  }

  private async _getPerformanceStats() {
    const telemetryRepo = AppDataSource.getRepository(TelemetryEvent);

    const stats = await telemetryRepo
      .createQueryBuilder('event')
      .select('COUNT(*)', 'totalEventsAllTime')
      .addSelect('MIN(event.event_timestamp)', 'oldestEvent')
      .addSelect('MAX(event.event_timestamp)', 'newestEvent')
      .getRawOne();

    const totalEventsAllTime = parseInt(stats.totalEventsAllTime) || 0;

    // Calcular eventos por minuto (últimos 60 minutos)
    const last60MinStats = await telemetryRepo
      .createQueryBuilder('event')
      .select('COUNT(*)', 'recentEvents')
      .where("event.created_at >= NOW() - INTERVAL '60 minutes'")
      .getRawOne();

    const avgEventsPerMinute = parseInt(last60MinStats.recentEvents) || 0;

    return {
      avgEventsPerMinute,
      totalEventsAllTime,
      oldestEvent: stats.oldestEvent ? new Date(stats.oldestEvent) : null,
      newestEvent: stats.newestEvent ? new Date(stats.newestEvent) : null,
    };
  }

  /**
   * Fecha as conexões (cleanup)
   */
  async close(): Promise<void> {
    await this.eventIngestionQueue.close();
    await this.masterDataQueue.close();
  }
}
