// apps/backend/src/modules/performance/services/performanceReportService.ts
import { AppDataSource } from '@/data-source.js';
import { EventType } from '@/entities/event-type.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { logger } from '@/shared/utils/logger.js';

interface PeriodDefinition {
  id: string;
  label: string;
  startDate: Date;
  endDate?: Date;
  date?: Date;
}

interface EventCount {
  eventType: string;
  counts: Record<string, number>;
}

export class PerformanceReportService {
  private driverRepository: DriverRepository;
  private telemetryEventRepository: TelemetryEventRepository;
  private eventTypeRepository;

  constructor() {
    this.driverRepository = new DriverRepository();
    this.telemetryEventRepository = new TelemetryEventRepository();
    this.eventTypeRepository = AppDataSource.getRepository(EventType);
  }

  public async generatePerformanceReport(
    driverId: number,
    reportDate?: string,
    periodDays: number = 30
  ) {
    logger.info(`Gerando relatório de performance para motorista ID: ${driverId}`);

    // 1. Buscar dados do motorista
    const driver = await this.driverRepository.findById(driverId);
    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    // 2. Definir data de referência
    const referenceDate = reportDate ? new Date(reportDate) : new Date();

    // 3. Gerar períodos dinâmicos
    const periods = this.generatePeriods(referenceDate, periodDays);

    // 4. Buscar tipos de evento de infração
    const infractionTypes = await this.eventTypeRepository.find({
      where: {
        classification: 'Infração de Condução',
      },
      order: {
        description: 'ASC',
      },
    });

    // 5. Calcular métricas para cada período
    const metrics = await this.calculateMetricsForPeriods(
      String(driver.external_id),
      periods,
      infractionTypes
    );

    // 6. Calcular total de eventos
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
        reportDateFormatted: this.formatReportDate(referenceDate),
        periodSummary: this.generatePeriodSummary(periods),
        acknowledgmentText:
          'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
      },
      performanceSummary: {
        periods: periods.map(p => ({
          id: p.id,
          label: p.label,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate?.toISOString(),
          date: p.date?.toISOString(),
        })),
        metrics,
        totalEvents,
      },
    };
  }

  private generatePeriods(referenceDate: Date, periodDays: number): PeriodDefinition[] {
    const periods: PeriodDefinition[] = [];

    const refDate = new Date(referenceDate.toISOString().split('T')[0] + 'T00:00:00.000Z');

    // Período principal
    const period1End = new Date(refDate);
    period1End.setUTCDate(period1End.getUTCDate() - 1);
    period1End.setUTCHours(23, 59, 59, 999);

    const period1Start = new Date(period1End);
    period1Start.setUTCDate(period1Start.getUTCDate() - (periodDays - 1));
    period1Start.setUTCHours(0, 0, 0, 0);

    periods.push({
      id: 'period1',
      label: `${this.formatDateShort(period1Start)} a ${this.formatDateShort(period1End)}`,
      startDate: period1Start,
      endDate: period1End,
    });

    // Período secundário
    const period2End = new Date(period1Start);
    period2End.setUTCDate(period2End.getUTCDate() - 1);
    period2End.setUTCHours(23, 59, 59, 999);

    const period2Start = new Date(period2End);
    period2Start.setUTCDate(period2Start.getUTCDate() - 6);
    period2Start.setUTCHours(0, 0, 0, 0);

    periods.push({
      id: 'period2',
      label: `${this.formatDateShort(period2Start)} a ${this.formatDateShort(period2End)}`,
      startDate: period2Start,
      endDate: period2End,
    });

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(refDate);
      dayDate.setUTCDate(dayDate.getUTCDate() - i);

      // Início do dia UTC
      const startOfDay = new Date(dayDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      // Fim do dia UTC
      const endOfDay = new Date(dayDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Meio-dia UTC para referência
      const referenceTime = new Date(dayDate);
      referenceTime.setUTCHours(12, 0, 0, 0);

      periods.push({
        id: `date${i + 1}`,
        label: this.formatDateShort(dayDate),
        date: referenceTime,
        startDate: startOfDay,
        endDate: endOfDay,
      });
    }

    return periods;
  }

  private async calculateMetricsForPeriods(
    driverExternalId: string,
    periods: PeriodDefinition[],
    infractionTypes: EventType[]
  ): Promise<EventCount[]> {
    // ✅ OTIMIZAÇÃO: Uma única query para todos os dados
    const allEvents = await this.getAllEventsForPeriods(driverExternalId, periods, infractionTypes);

    // ✅ Processar em memória (muito mais rápido)
    const metrics: EventCount[] = [];

    for (const infractionType of infractionTypes) {
      const eventCount: EventCount = {
        eventType: infractionType.description,
        counts: {},
      };

      let hasEvents = false;

      for (const period of periods) {
        // ✅ Filtrar eventos em memória ao invés de fazer query
        const count = this.countEventsInMemory(
          allEvents,
          infractionType.external_id.toString(),
          period
        );

        eventCount.counts[period.id] = count;

        if (count > 0) {
          hasEvents = true;
        }
      }
      if (hasEvents) {
        metrics.push(eventCount);
      }
    }

    return metrics;
  }
  private async getAllEventsForPeriods(
    driverExternalId: string,
    periods: PeriodDefinition[],
    infractionTypes: EventType[]
  ): Promise<any[]> {
    const allDates = periods.flatMap(p => [p.startDate, p.endDate || p.startDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const eventTypeIds = infractionTypes.map(t => t.external_id.toString());
    const events = await this.telemetryEventRepository.repository
      .createQueryBuilder('event')
      .select(['event.event_type_external_id', 'event.occurred_at'])
      .where('event.driver_external_id = :driverExternalId', { driverExternalId })
      .andWhere('event.event_type_external_id IN (:...eventTypeIds)', { eventTypeIds })
      .andWhere('event.occurred_at >= :minDate', { minDate })
      .andWhere('event.occurred_at <= :maxDate', { maxDate })
      .getMany();

    return events;
  }

  private countEventsInMemory(
    allEvents: any[],
    eventTypeExternalId: string,
    period: PeriodDefinition
  ): number {
    return allEvents.filter(
      event =>
        event.event_type_external_id === eventTypeExternalId &&
        event.occurred_at >= period.startDate &&
        event.occurred_at <= (period.endDate || period.startDate)
    ).length;
  }

  private formatReportDate(date: Date): string {
    const months = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `Brasília, ${day} de ${month} de ${year}`;
  }

  private formatDateShort(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  }

  private generatePeriodSummary(periods: PeriodDefinition[]): string {
    const mainPeriods = periods.filter(p => p.id.startsWith('period'));
    const dailyPeriods = periods.filter(p => p.id.startsWith('date'));

    let summary = `Períodos analisados: ${mainPeriods.map(p => p.label).join(', ')}`;
    if (dailyPeriods.length > 0) {
      summary += ` e dias individuais: ${dailyPeriods.map(p => p.label).join(', ')}`;
    }

    return summary;
  }
}
