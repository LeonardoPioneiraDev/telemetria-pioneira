// apps/backend/src/modules/performance/services/performanceReportService.ts
import { AppDataSource } from '@/data-source.js';
import { Driver } from '@/entities/driver.entity.js';
import { EventType } from '@/entities/event-type.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { logger } from '@/shared/utils/logger.js';
import { Repository } from 'typeorm';

interface PeriodDefinition {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  date: Date; // A data central do dia/período para referência
}

interface EventCount {
  eventType: string;
  counts: Record<string, number>;
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
  private telemetryEventRepository: TelemetryEventRepository;
  private eventTypeRepository: Repository<EventType>;

  constructor(
    driverRepository: DriverRepository = new DriverRepository(),
    telemetryEventRepository: TelemetryEventRepository = new TelemetryEventRepository(),
    eventTypeRepository: Repository<EventType> = AppDataSource.getRepository(EventType)
  ) {
    this.driverRepository = driverRepository;
    this.telemetryEventRepository = telemetryEventRepository;
    this.eventTypeRepository = eventTypeRepository;
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

    const driver = await this.driverRepository.findById(driverId);
    if (!driver) {
      throw new DriverNotFoundError();
    }

    const infractionTypes = await this.eventTypeRepository.find({
      where: { classification: 'Infração de Condução' },
      order: { description: 'ASC' },
    });
    // Convertemos para bigint para garantir a comparação correta com o banco
    const eventTypeIds = infractionTypes.map(t => BigInt(t.external_id));

    const allEventsInWindow = await this.telemetryEventRepository.repository
      .createQueryBuilder('event')
      .leftJoin(EventType, 'eventType', 'eventType.external_id = event.event_type_external_id')
      .leftJoin(Driver, 'driver', 'driver.external_id = event.driver_external_id')
      .select([
        'event.event_timestamp AS "event_timestamp"',
        'event.event_type_external_id AS "event_type_external_id"',
      ])
      .where('driver.external_id = :driverExternalId', {
        driverExternalId: driver.external_id,
      })
      .andWhere('event.event_type_external_id IN (:...eventTypeIds)', { eventTypeIds })
      .andWhere('event.event_timestamp >= :windowStartDate', { windowStartDate })
      .andWhere('event.event_timestamp <= :windowEndDate', { windowEndDate })
      .getRawMany(); // 3. Usamos getRawMany para obter um resultado simples

    if (allEventsInWindow.length === 0) {
      return this._buildEmptyReport(driver, reportDetailsReferenceDate);
    }

    const groupedPeriods = this._generateFixedPeriods(
      reportDetailsReferenceDate,
      allEventsInWindow
    );
    groupedPeriods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    // ✅ Ajustamos a chamada para a nova estrutura de 'allEventsInWindow'
    const metrics = await this.calculateMetricsForPeriods(
      groupedPeriods,
      infractionTypes,
      allEventsInWindow
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
        reportDateFormatted: this.formatReportDate(reportDetailsReferenceDate),
        periodSummary: this._generatePeriodSummary(groupedPeriods),
        acknowledgmentText:
          'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
      },
      performanceSummary: {
        periods: groupedPeriods.map(p => ({
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

  public async generatePerformanceReport(
    driverId: number,
    reportDate?: string,
    _searchWindowDays?: number // Parâmetro ignorado, mantido para compatibilidade da assinatura do método
  ) {
    let effectiveReferenceDate: Date;
    if (reportDate) {
      const [year, month, day] = reportDate.split('-').map(Number);
      effectiveReferenceDate = new Date(Date.UTC(year!, month! - 1, day));
    } else {
      const now = new Date();
      effectiveReferenceDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
    }

    // AJUSTE: A janela de busca agora é definida pela nova regra de negócio.
    // Começa no primeiro dia do mês, dois meses antes da data de referência.
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
    _startDateString: string, // Parâmetro ignorado
    endDateString: string
  ) {
    // AJUSTE: A data de referência é o `endDateString`. `startDateString` é ignorado.
    const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
    const reportDetailsReferenceDate = new Date(Date.UTC(endYear!, endMonth! - 1, endDay));

    if (isNaN(reportDetailsReferenceDate.getTime())) {
      throw new InvalidDateRangeError('Data final inválida.');
    }

    // Começa no primeiro dia do mês, dois meses antes da data de referência.
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
   * NOVO MÉTODO: Gera períodos com base na regra de negócio fixa.
   * - 2 meses completos anteriores à data de referência.
   * - Semanas do mês da data de referência.
   */
  private _generateFixedPeriods(referenceDate: Date, allEvents: any[]): PeriodDefinition[] {
    const periods: PeriodDefinition[] = [];
    const refYear = referenceDate.getUTCFullYear();
    const refMonth = referenceDate.getUTCMonth(); // 0-11

    // 1. Adicionar os dois meses completos anteriores
    for (let i = 2; i >= 1; i--) {
      const targetDate = new Date(Date.UTC(refYear, refMonth - i, 1));
      const monthStartDate = new Date(
        Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1)
      );
      const monthEndDate = new Date(
        Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)
      );
      monthEndDate.setUTCHours(23, 59, 59, 999);

      const period: PeriodDefinition = {
        id: `mes-${this.formatDateIsoMonthYear(monthStartDate)}`,
        label: this.formatDateMonthYear(monthStartDate),
        startDate: monthStartDate,
        endDate: monthEndDate,
        date: new Date(
          monthStartDate.getTime() + (monthEndDate.getTime() - monthStartDate.getTime()) / 2
        ),
      };

      if (allEvents.some(e => this._isEventInPeriod(e, period.startDate, period.endDate))) {
        periods.push(period);
      }
    }

    // 2. Adicionar as semanas do mês atual (mês de referência)
    const firstDayOfCurrentMonth = new Date(Date.UTC(refYear, refMonth, 1));
    let weekStartDate = firstDayOfCurrentMonth;

    while (weekStartDate.getUTCMonth() === refMonth && weekStartDate <= referenceDate) {
      // O final da semana é 6 dias após o início.
      let weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

      // Garante que o fim da semana não ultrapasse a data de referência.
      if (weekEndDate > referenceDate) {
        weekEndDate = new Date(referenceDate);
      }
      weekEndDate.setUTCHours(23, 59, 59, 999);

      const period: PeriodDefinition = {
        id: `semana-${this.formatDateShort(weekStartDate).replace(/\./g, '')}_${this.formatDateShort(weekEndDate).replace(/\./g, '')}`,
        label: `Semana ${this.formatDateShort(weekStartDate)} a ${this.formatDateShort(weekEndDate)}`,
        startDate: weekStartDate,
        endDate: weekEndDate,
        date: new Date(
          weekStartDate.getTime() + (weekEndDate.getTime() - weekStartDate.getTime()) / 2
        ),
      };

      if (allEvents.some(e => this._isEventInPeriod(e, period.startDate, period.endDate))) {
        periods.push(period);
      }

      // Avança para o início da próxima semana
      weekStartDate = new Date(weekEndDate);
      weekStartDate.setUTCHours(0, 0, 0, 0);
      weekStartDate.setUTCDate(weekStartDate.getUTCDate() + 1);
    }

    return periods;
  }

  private _isEventInPeriod(event: any, periodStartDate: Date, periodEndDate: Date): boolean {
    const eventOccurredAt = new Date(event.event_timestamp);
    return (
      eventOccurredAt.getTime() >= periodStartDate.getTime() &&
      eventOccurredAt.getTime() <= periodEndDate.getTime()
    );
  }

  private async calculateMetricsForPeriods(
    periods: PeriodDefinition[],
    infractionTypes: EventType[],
    allEventsInWindow: any[]
  ): Promise<EventCount[]> {
    const metrics: EventCount[] = [];
    for (const infractionType of infractionTypes) {
      const eventCount: EventCount = {
        eventType: infractionType.description,
        counts: {},
      };
      let hasEventsForThisTypeInAnyPeriod = false;

      for (const period of periods) {
        const count = allEventsInWindow.filter(
          event =>
            // ✅ Acessamos a propriedade diretamente do resultado 'raw'
            BigInt(event.event_type_external_id) === BigInt(infractionType.external_id) &&
            this._isEventInPeriod(event, period.startDate, period.endDate)
        ).length;

        eventCount.counts[period.id] = count;
        if (count > 0) {
          hasEventsForThisTypeInAnyPeriod = true;
        }
      }
      if (hasEventsForThisTypeInAnyPeriod) {
        metrics.push(eventCount);
      }
    }
    return metrics;
  }

  // --- Funções Auxiliares de Formatação e Construção ---

  private _buildEmptyReport(driver: Driver, referenceDate: Date) {
    return {
      driverInfo: {
        id: driver.id,
        name: driver.name,
        badge: driver.employee_number || null,
      },
      reportDetails: {
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
    return date.toISOString().slice(0, 7); // YYYY-MM
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
    const labels = periods.map(p => p.label).reverse(); // Reverte para ordem cronológica
    if (labels.length === 1) {
      return `Período analisado: ${labels[0]}`;
    }
    return `Períodos analisados: ${labels.join(', ')}`;
  }
}
