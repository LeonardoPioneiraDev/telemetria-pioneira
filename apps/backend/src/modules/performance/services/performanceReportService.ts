// apps/backend/src/modules/performance/services/performanceReportService.ts
import { AppDataSource } from '@/data-source.js';
import { Driver } from '@/entities/driver.entity.js';
import { EventType } from '@/entities/event-type.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { logger } from '@/shared/utils/logger.js';
import { Repository } from 'typeorm';

interface PeriodDefinition {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  date: Date;
}

interface EventCount {
  eventType: string;
  counts: Record<string, number>;
}

interface AggregatedEventCount {
  event_type_external_id: string;
  period_start: string;
  count: string;
}

export class InvalidDateRangeError extends Error {
  constructor(message: string = 'A data final não pode ser anterior à data inicial.') {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}

export class DriverNotFoundError extends Error {
  constructor(message: string = 'Motorista não encontrado') {
    super(message);
    this.name = 'DriverNotFoundError';
  }
}

export class PerformanceReportService {
  private driverRepository: DriverRepository;
  private eventTypeRepository: Repository<EventType>;

  // Cache estático para EventTypes (raramente mudam)
  private static eventTypeCache: EventType[] | null = null;
  private static eventTypeCacheExpiry: number = 0;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(
    driverRepository: DriverRepository = new DriverRepository(),
    eventTypeRepository: Repository<EventType> = AppDataSource.getRepository(EventType)
  ) {
    this.driverRepository = driverRepository;
    this.eventTypeRepository = eventTypeRepository;
  }

  /**
   * Busca EventTypes com cache em memória
   */
  private async getInfractionTypes(): Promise<EventType[]> {
    const now = Date.now();

    if (
      PerformanceReportService.eventTypeCache &&
      PerformanceReportService.eventTypeCacheExpiry > now
    ) {
      return PerformanceReportService.eventTypeCache;
    }

    const types = await this.eventTypeRepository.find({
      where: { classification: 'Infração de Condução' },
      order: { description: 'ASC' },
    });

    PerformanceReportService.eventTypeCache = types;
    PerformanceReportService.eventTypeCacheExpiry = now + PerformanceReportService.CACHE_TTL_MS;

    return types;
  }

  private async _processAndGenerateReport(
    driverId: number,
    windowStartDate: Date,
    windowEndDate: Date,
    reportDetailsReferenceDate: Date
  ) {
    logger.info(
      `Processando relatório para motorista ID: ${driverId} entre ${windowStartDate.toISOString()} e ${windowEndDate.toISOString()}`
    );

    // Paralelizar busca de driver e event types
    const [driver, infractionTypes] = await Promise.all([
      this.driverRepository.findById(driverId),
      this.getInfractionTypes(),
    ]);

    if (!driver) {
      throw new DriverNotFoundError();
    }

    const eventTypeIds = infractionTypes.map(t => BigInt(t.external_id));

    // Gerar períodos primeiro (sem depender dos eventos)
    const periods = this._generatePeriodDefinitions(reportDetailsReferenceDate);

    if (periods.length === 0) {
      return this._buildEmptyReport(driver, reportDetailsReferenceDate);
    }

    // Query otimizada: buscar contagens agregadas diretamente do banco
    const aggregatedCounts = await this._getAggregatedEventCounts(
      driver.external_id,
      eventTypeIds,
      windowStartDate,
      windowEndDate,
      periods
    );

    // Se não há eventos, retorna relatório vazio
    if (aggregatedCounts.length === 0) {
      return this._buildEmptyReport(driver, reportDetailsReferenceDate);
    }

    // Filtrar períodos que têm eventos
    const periodsWithEvents = this._filterPeriodsWithEvents(periods, aggregatedCounts);

    if (periodsWithEvents.length === 0) {
      return this._buildEmptyReport(driver, reportDetailsReferenceDate);
    }

    periodsWithEvents.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    // Construir métricas a partir dos dados agregados
    const metrics = this._buildMetricsFromAggregated(
      periodsWithEvents,
      infractionTypes,
      aggregatedCounts
    );

    const totalEvents = metrics.reduce((total, metric) => {
      return total + Object.values(metric.counts).reduce((sum, count) => sum + count, 0);
    }, 0);

    return {
      driverInfo: {
        id: driver.id,
        name: driver.name,
        badge: driver.employee_number || null,
      },
      reportDetails: {
        reportDate: reportDetailsReferenceDate.toISOString(),
        reportDateFormatted: this.formatReportDate(reportDetailsReferenceDate),
        periodSummary: this._generatePeriodSummary(periodsWithEvents),
        acknowledgmentText:
          'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
      },
      performanceSummary: {
        periods: periodsWithEvents.map(p => ({
          id: p.id,
          label: p.label,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          date: p.date.toISOString(),
        })),
        metrics,
        totalEvents,
      },
    };
  }

  /**
   * Query otimizada: busca contagens agregadas por event_type e período diretamente no banco
   */
  private async _getAggregatedEventCounts(
    driverExternalId: bigint,
    eventTypeIds: bigint[],
    windowStartDate: Date,
    windowEndDate: Date,
    periods: PeriodDefinition[]
  ): Promise<AggregatedEventCount[]> {
    if (periods.length === 0 || eventTypeIds.length === 0) {
      return [];
    }

    // Construir CASE WHEN para mapear eventos aos períodos no SQL
    const periodCases = periods
      .map(
        p =>
          `WHEN event_timestamp >= '${p.startDate.toISOString()}' AND event_timestamp <= '${p.endDate.toISOString()}' THEN '${p.startDate.toISOString()}'`
      )
      .join('\n        ');

    const query = `
      SELECT
        event_type_external_id::text,
        CASE
          ${periodCases}
          ELSE NULL
        END as period_start,
        COUNT(*)::text as count
      FROM telemetry_events
      WHERE driver_external_id = $1
        AND event_type_external_id = ANY($2::bigint[])
        AND event_timestamp >= $3
        AND event_timestamp <= $4
      GROUP BY event_type_external_id, period_start
      HAVING CASE
        ${periodCases}
        ELSE NULL
      END IS NOT NULL
    `;

    const results = await AppDataSource.query(query, [
      driverExternalId.toString(),
      eventTypeIds.map(id => id.toString()),
      windowStartDate,
      windowEndDate,
    ]);

    return results as AggregatedEventCount[];
  }

  /**
   * Filtra períodos que possuem pelo menos um evento
   */
  private _filterPeriodsWithEvents(
    periods: PeriodDefinition[],
    aggregatedCounts: AggregatedEventCount[]
  ): PeriodDefinition[] {
    const periodStartsWithEvents = new Set(
      aggregatedCounts.map(ac => new Date(ac.period_start).toISOString())
    );

    return periods.filter(p => periodStartsWithEvents.has(p.startDate.toISOString()));
  }

  /**
   * Constrói métricas a partir dos dados agregados do banco
   */
  private _buildMetricsFromAggregated(
    periods: PeriodDefinition[],
    infractionTypes: EventType[],
    aggregatedCounts: AggregatedEventCount[]
  ): EventCount[] {
    // Criar mapa para lookup rápido: Map<eventTypeId_periodStart, count>
    const countMap = new Map<string, number>();
    for (const ac of aggregatedCounts) {
      const key = `${ac.event_type_external_id}_${ac.period_start}`;
      countMap.set(key, parseInt(ac.count, 10));
    }

    // Criar mapa de período por startDate
    const periodMap = new Map<string, PeriodDefinition>();
    for (const p of periods) {
      periodMap.set(p.startDate.toISOString(), p);
    }

    const metrics: EventCount[] = [];

    for (const infractionType of infractionTypes) {
      const eventCount: EventCount = {
        eventType: infractionType.description,
        counts: {},
      };
      let hasEventsForThisType = false;

      for (const period of periods) {
        const key = `${infractionType.external_id}_${period.startDate.toISOString()}`;
        const count = countMap.get(key) || 0;
        eventCount.counts[period.id] = count;

        if (count > 0) {
          hasEventsForThisType = true;
        }
      }

      if (hasEventsForThisType) {
        metrics.push(eventCount);
      }
    }

    return metrics;
  }

  public async generatePerformanceReport(
    driverId: number,
    reportDate?: string,
    _searchWindowDays?: number
  ) {
    let effectiveReferenceDate: Date;
    if (reportDate) {
      const [year, month, day] = reportDate.split('-').map(Number);
      effectiveReferenceDate = new Date(Date.UTC(year!, month! - 1, day, 12));
    } else {
      const now = new Date();
      effectiveReferenceDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
    }

    const windowStartDate = new Date(
      Date.UTC(effectiveReferenceDate.getUTCFullYear(), effectiveReferenceDate.getUTCMonth() - 2, 1)
    );
    windowStartDate.setUTCHours(0, 0, 0, 0);

    const windowEndDate = new Date(effectiveReferenceDate);
    windowEndDate.setUTCHours(23, 59, 59, 999);

    return this._processAndGenerateReport(
      driverId,
      windowStartDate,
      windowEndDate,
      effectiveReferenceDate
    );
  }

  public async generatePerformanceReportByDateRange(
    driverId: number,
    _startDateString: string,
    endDateString: string
  ) {
    const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
    const reportDetailsReferenceDate = new Date(Date.UTC(endYear!, endMonth! - 1, endDay, 12));

    if (isNaN(reportDetailsReferenceDate.getTime())) {
      throw new InvalidDateRangeError('Data final inválida.');
    }

    const windowStartDate = new Date(
      Date.UTC(
        reportDetailsReferenceDate.getUTCFullYear(),
        reportDetailsReferenceDate.getUTCMonth() - 2,
        1
      )
    );
    windowStartDate.setUTCHours(0, 0, 0, 0);

    const windowEndDate = new Date(reportDetailsReferenceDate);
    windowEndDate.setUTCHours(23, 59, 59, 999);

    return this._processAndGenerateReport(
      driverId,
      windowStartDate,
      windowEndDate,
      reportDetailsReferenceDate
    );
  }

  /**
   * Gera definições de períodos sem depender dos eventos
   */
  private _generatePeriodDefinitions(referenceDate: Date): PeriodDefinition[] {
    const periods: PeriodDefinition[] = [];
    const refYear = referenceDate.getUTCFullYear();
    const refMonth = referenceDate.getUTCMonth();

    // 1. Dois meses completos anteriores
    for (let i = 2; i >= 1; i--) {
      const targetDate = new Date(Date.UTC(refYear, refMonth - i, 1));
      const monthStartDate = new Date(
        Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1)
      );
      const monthEndDate = new Date(
        Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)
      );
      monthEndDate.setUTCHours(23, 59, 59, 999);

      periods.push({
        id: `mes-${this.formatDateIsoMonthYear(monthStartDate)}`,
        label: this.formatDateMonthYear(monthStartDate),
        startDate: monthStartDate,
        endDate: monthEndDate,
        date: new Date(
          monthStartDate.getTime() + (monthEndDate.getTime() - monthStartDate.getTime()) / 2
        ),
      });
    }

    // 2. Semanas do mês atual
    const firstDayOfCurrentMonth = new Date(Date.UTC(refYear, refMonth, 1));
    let weekStartDate = new Date(firstDayOfCurrentMonth);

    while (weekStartDate.getUTCMonth() === refMonth && weekStartDate <= referenceDate) {
      let weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

      if (weekEndDate > referenceDate) {
        weekEndDate = new Date(referenceDate);
      }
      weekEndDate.setUTCHours(23, 59, 59, 999);

      periods.push({
        id: `semana-${this.formatDateShort(weekStartDate).replace(/\./g, '')}_${this.formatDateShort(weekEndDate).replace(/\./g, '')}`,
        label: `Semana ${this.formatDateShort(weekStartDate)} a ${this.formatDateShort(weekEndDate)}`,
        startDate: new Date(weekStartDate),
        endDate: weekEndDate,
        date: new Date(
          weekStartDate.getTime() + (weekEndDate.getTime() - weekStartDate.getTime()) / 2
        ),
      });

      weekStartDate = new Date(weekEndDate);
      weekStartDate.setUTCHours(0, 0, 0, 0);
      weekStartDate.setUTCDate(weekStartDate.getUTCDate() + 1);
    }

    return periods;
  }

  private _buildEmptyReport(driver: Driver, referenceDate: Date) {
    return {
      driverInfo: {
        id: driver.id,
        name: driver.name,
        badge: driver.employee_number || null,
      },
      reportDetails: {
        reportDate: referenceDate.toISOString(),
        reportDateFormatted: this.formatReportDate(referenceDate),
        periodSummary: 'Nenhum evento de infração encontrado no período.',
        acknowledgmentText:
          'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
      },
      performanceSummary: {
        periods: [],
        metrics: [],
        totalEvents: 0,
      },
    };
  }

  private formatReportDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo',
    };
    const formatter = new Intl.DateTimeFormat('pt-BR', options);
    return `Brasília, ${formatter.format(date)}`;
  }

  private formatDateShort(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  }

  private formatDateIsoMonthYear(date: Date): string {
    return date.toISOString().slice(0, 7);
  }

  private formatDateMonthYear(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    };
    const formatter = new Intl.DateTimeFormat('pt-BR', options);
    return formatter
      .format(date)
      .replace(/ de /, '/')
      .replace(/^\w/, c => c.toUpperCase());
  }

  private _generatePeriodSummary(periods: PeriodDefinition[]): string {
    if (periods.length === 0) {
      return 'Nenhum período com eventos para analisar.';
    }
    const labels = periods.map(p => p.label).reverse();
    if (labels.length === 1) {
      return `Período analisado: ${labels[0]}`;
    }
    return `Períodos analisados: ${labels.join(', ')}`;
  }
}
