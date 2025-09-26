// // apps/backend/src/modules/performance/services/performanceReportService.ts
// import { AppDataSource } from '@/data-source.js';
// import { EventType } from '@/entities/event-type.entity.js';
// import { DriverRepository } from '@/repositories/driver.repository.js';
// import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
// import { logger } from '@/shared/utils/logger.js';
// import { Repository } from 'typeorm';

// // NOTA: Certifique-se que performanceReportQuerySchema (em performanceReport.schema.ts)
// // tenha seu `max` ajustado para permitir a janela de busca desejada (ex: 365 para um ano).
// // Ex: periodDays: z.coerce.number().int().min(1).max(365).optional().default(30),

// interface PeriodDefinition {
//   id: string;
//   label: string;
//   startDate: Date;
//   endDate: Date;
//   date: Date; // A data central do dia/período para referência
// }

// interface EventCount {
//   eventType: string;
//   counts: Record<string, number>;
// }

// export class DriverNotFoundError extends Error {
//   constructor(message: string = 'Motorista não encontrado') {
//     super(message);
//     this.name = 'DriverNotFoundError';
//   }
// }

// // Enum para as estratégias de agrupamento
// enum GroupingStrategy {
//   DAY = 'day',
//   WEEK = 'week',
//   MONTH = 'month',
//   QUARTER = 'quarter',
// }

// export class PerformanceReportService {
//   private driverRepository: DriverRepository;
//   private telemetryEventRepository: TelemetryEventRepository;
//   private eventTypeRepository: Repository<EventType>;

//   constructor(
//     driverRepository: DriverRepository = new DriverRepository(),
//     telemetryEventRepository: TelemetryEventRepository = new TelemetryEventRepository(),
//     eventTypeRepository: Repository<EventType> = AppDataSource.getRepository(EventType)
//   ) {
//     this.driverRepository = driverRepository;
//     this.telemetryEventRepository = telemetryEventRepository;
//     this.eventTypeRepository = eventTypeRepository;
//   }

//   public async generatePerformanceReport(
//     driverId: number,
//     reportDate?: string,
//     searchWindowDays: number = 30
//   ) {
//     logger.info(
//       `Gerando relatório de performance para motorista ID: ${driverId}, data de referência: ${
//         reportDate || 'atual'
//       }, janela de busca: ${searchWindowDays} dias`
//     );

//     const driver = await this.driverRepository.findById(driverId);
//     if (!driver) {
//       throw new DriverNotFoundError();
//     }

//     let effectiveReferenceDate: Date;
//     if (reportDate) {
//       const [year, month, day] = reportDate.split('-').map(Number);
//       effectiveReferenceDate = new Date(Date.UTC(year, month - 1, day));
//     } else {
//       const now = new Date();
//       effectiveReferenceDate = new Date(
//         Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
//       );
//     }

//     const windowEndDate = new Date(effectiveReferenceDate);
//     windowEndDate.setUTCHours(23, 59, 59, 999);

//     const windowStartDate = new Date(effectiveReferenceDate);
//     windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (searchWindowDays - 1));
//     windowStartDate.setUTCHours(0, 0, 0, 0);

//     const infractionTypes = await this.eventTypeRepository.find({
//       where: { classification: 'Infração de Condução' },
//       order: { description: 'ASC' },
//     });
//     const eventTypeIds = infractionTypes.map(t => t.external_id.toString());

//     // 1. Buscar TODOS os eventos relevantes para o motorista dentro da janela definida.
//     const allEventsInWindow = await this.telemetryEventRepository.repository
//       .createQueryBuilder('event')
//       .select(['event.event_type_external_id', 'event.occurred_at'])
//       .where('event.driver_external_id = :driverExternalId', {
//         driverExternalId: String(driver.external_id),
//       })
//       .andWhere('event.event_type_external_id IN (:...eventTypeIds)', { eventTypeIds })
//       .andWhere('event.occurred_at >= :windowStartDate', { windowStartDate })
//       .andWhere('event.occurred_at <= :windowEndDate', { windowEndDate })
//       .getMany();

//     // Se não houver eventos, retorna um relatório vazio para evitar cálculos desnecessários
//     if (allEventsInWindow.length === 0) {
//       return {
//         driverInfo: {
//           id: driver.id,
//           name: driver.name,
//           badge: driver.employee_number || null,
//         },
//         reportDetails: {
//           reportDateFormatted: this.formatReportDate(effectiveReferenceDate),
//           periodSummary: 'Nenhum período analisado.',
//           acknowledgmentText:
//             'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
//         },
//         performanceSummary: {
//           periods: [],
//           metrics: [],
//           totalEvents: 0,
//         },
//       };
//     }

//     // 2. Determinar a estratégia de agrupamento
//     // Primeiro, a estratégia baseada na janela de busca solicitada
//     const requestedWindowDays = this._getDaysDifference(windowStartDate, windowEndDate);
//     let effectiveGroupingStrategy = this._getGroupingStrategy(requestedWindowDays);

//     // Segundo, a correção: se o span REAL de eventos for pequeno, força agrupamento por DIA
//     const minEventDate = new Date(Math.min(...allEventsInWindow.map(e => e.occurred_at.getTime())));
//     const maxEventDate = new Date(Math.max(...allEventsInWindow.map(e => e.occurred_at.getTime())));
//     const actualEventSpanDays = this._getDaysDifference(minEventDate, maxEventDate);

//     if (actualEventSpanDays <= 7) {
//       effectiveGroupingStrategy = GroupingStrategy.DAY;
//       logger.info(
//         `Forçando agrupamento por DIA pois o span real de eventos (${actualEventSpanDays} dias) é <= 7.`
//       );
//     }

//     logger.info(`Estratégia de agrupamento final: ${effectiveGroupingStrategy}.`);

//     // 3. Gerar PeriodDefinitions **APENAS** para os períodos que **contêm eventos**.
//     const groupedPeriods = this._generateGroupedPeriods(
//       windowStartDate,
//       windowEndDate,
//       effectiveGroupingStrategy,
//       allEventsInWindow // Passa todos os eventos para filtrar
//     );

//     // Ordenar períodos do mais recente para o mais antigo (para exibição)
//     groupedPeriods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

//     // 4. Calcular métricas para os períodos que realmente contêm dados.
//     const metrics = await this.calculateMetricsForPeriods(
//       String(driver.external_id),
//       groupedPeriods,
//       infractionTypes,
//       allEventsInWindow // Passa todos os eventos para evitar nova consulta
//     );

//     // 5. Calcular total de eventos
//     const totalEvents = metrics.reduce((total, metric) => {
//       return total + Object.values(metric.counts).reduce((sum, count) => sum + count, 0);
//     }, 0);

//     return {
//       driverInfo: {
//         id: driver.id,
//         name: driver.name,
//         badge: driver.employee_number || null,
//       },
//       reportDetails: {
//         reportDateFormatted: this.formatReportDate(effectiveReferenceDate),
//         periodSummary: this._generatePeriodSummary(groupedPeriods),
//         acknowledgmentText:
//           'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
//       },
//       performanceSummary: {
//         periods: groupedPeriods.map(p => ({
//           id: p.id,
//           label: p.label,
//           startDate: p.startDate.toISOString(),
//           endDate: p.endDate.toISOString(),
//           date: p.date.toISOString(),
//         })),
//         metrics,
//         totalEvents,
//       },
//     };
//   }

//   // --- Funções Auxiliares para o Agrupamento Inteligente ---

//   private _getDaysDifference(startDate: Date, endDate: Date): number {
//     const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
//     // Adiciona 1 dia para incluir o dia de início na contagem do intervalo
//     return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
//   }

//   private _getGroupingStrategy(daysDifference: number): GroupingStrategy {
//     if (daysDifference <= 7) {
//       return GroupingStrategy.DAY;
//     } else if (daysDifference <= 30) {
//       return GroupingStrategy.WEEK;
//     } else if (daysDifference <= 90) {
//       return GroupingStrategy.MONTH;
//     } else {
//       return GroupingStrategy.QUARTER;
//     }
//   }

//   // Helper para verificar se um evento ocorre dentro de um período UTC
//   private _isEventInPeriod(event: any, periodStartDate: Date, periodEndDate: Date): boolean {
//     const eventOccurredAt = new Date(event.occurred_at);
//     // Verificar se o evento está DENTRO ou NOS LIMITES do período
//     return (
//       eventOccurredAt.getTime() >= periodStartDate.getTime() &&
//       eventOccurredAt.getTime() <= periodEndDate.getTime()
//     );
//   }

//   private _generateGroupedPeriods(
//     windowStartDate: Date,
//     windowEndDate: Date,
//     strategy: GroupingStrategy,
//     allEvents: any[]
//   ): PeriodDefinition[] {
//     const periods: PeriodDefinition[] = [];
//     let currentGroupStart = new Date(windowStartDate);

//     while (currentGroupStart <= windowEndDate) {
//       let periodEndDate: Date;
//       let id: string;
//       let label: string;
//       let nextGroupStart = new Date(currentGroupStart); // Usado para avançar o loop

//       switch (strategy) {
//         case GroupingStrategy.DAY:
//           periodEndDate = new Date(currentGroupStart);
//           periodEndDate.setUTCHours(23, 59, 59, 999);
//           id = `dia-${this.formatDateIso(currentGroupStart)}`;
//           label = this.formatDateShort(currentGroupStart);
//           nextGroupStart.setUTCDate(nextGroupStart.getUTCDate() + 1);
//           break;

//         case GroupingStrategy.WEEK:
//           // Ajusta para o início da semana (domingo) que contém currentGroupStart
//           const startOfWeek = new Date(
//             Date.UTC(
//               currentGroupStart.getUTCFullYear(),
//               currentGroupStart.getUTCMonth(),
//               currentGroupStart.getUTCDate() - currentGroupStart.getUTCDay()
//             )
//           );
//           periodEndDate = new Date(startOfWeek);
//           periodEndDate.setUTCDate(startOfWeek.getUTCDate() + 6); // Fim da semana (sábado)
//           periodEndDate.setUTCHours(23, 59, 59, 999);

//           id = `semana-${this.formatDateShort(startOfWeek).replace(/\./g, '')}_${this.formatDateShort(periodEndDate).replace(/\./g, '')}`; // Ex: semana-21092025_27092025
//           label = `Semana ${this.formatDateShort(startOfWeek)} a ${this.formatDateShort(periodEndDate)}`;

//           currentGroupStart = startOfWeek; // Usa o início da semana real para o período
//           nextGroupStart.setUTCDate(startOfWeek.getUTCDate() + 7); // Próxima semana
//           break;

//         case GroupingStrategy.MONTH:
//           // Ajusta para o início do mês que contém currentGroupStart
//           const startOfMonth = new Date(
//             Date.UTC(currentGroupStart.getUTCFullYear(), currentGroupStart.getUTCMonth(), 1)
//           );
//           periodEndDate = new Date(
//             startOfMonth.getUTCFullYear(),
//             startOfMonth.getUTCMonth() + 1,
//             0
//           ); // Último dia do mês
//           periodEndDate.setUTCHours(23, 59, 59, 999);

//           id = `mes-${this.formatDateIsoMonthYear(startOfMonth)}`;
//           label = this.formatDateMonthYear(startOfMonth);

//           currentGroupStart = startOfMonth; // Usa o início do mês real para o período
//           nextGroupStart.setUTCMonth(startOfMonth.getUTCMonth() + 1); // Próximo mês
//           break;

//         case GroupingStrategy.QUARTER:
//           const currentMonth = currentGroupStart.getUTCMonth();
//           const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, 9
//           const startOfQuarter = new Date(
//             Date.UTC(currentGroupStart.getUTCFullYear(), quarterStartMonth, 1)
//           );

//           periodEndDate = new Date(startOfQuarter.getUTCFullYear(), quarterStartMonth + 3, 0); // Último dia do trimestre
//           periodEndDate.setUTCHours(23, 59, 59, 999);

//           const quarterNumber = Math.floor(quarterStartMonth / 3) + 1;
//           id = `trimestre-${startOfQuarter.getUTCFullYear()}-Q${quarterNumber}`;
//           label = `Trimestre ${quarterNumber}/${startOfQuarter.getUTCFullYear()}`;

//           currentGroupStart = startOfQuarter; // Usa o início do trimestre real para o período
//           nextGroupStart.setUTCMonth(startOfQuarter.getUTCMonth() + 3); // Próximo trimestre
//           break;

//         default:
//           throw new Error('Estratégia de agrupamento desconhecida.');
//       }

//       // Garante que o período gerado não ultrapasse a windowEndDate para o cálculo dos eventos
//       const actualPeriodEndDateForCounting = new Date(
//         Math.min(periodEndDate.getTime(), windowEndDate.getTime())
//       );
//       const actualPeriodStartDateForCounting = new Date(
//         Math.max(currentGroupStart.getTime(), windowStartDate.getTime())
//       );

//       const hasEventsInThisPeriod = allEvents.some(event =>
//         this._isEventInPeriod(
//           event,
//           actualPeriodStartDateForCounting,
//           actualPeriodEndDateForCounting
//         )
//       );

//       // Adiciona o período APENAS se ele contiver eventos.
//       if (hasEventsInThisPeriod) {
//         periods.push({
//           id,
//           label,
//           startDate: new Date(currentGroupStart), // A data de início real do período (domingo/dia 1/etc)
//           endDate: new Date(periodEndDate), // A data de fim real do período
//           date: new Date(
//             currentGroupStart.getTime() +
//               (periodEndDate.getTime() - currentGroupStart.getTime()) / 2
//           ), // Meio do período
//         });
//       }

//       currentGroupStart = nextGroupStart; // Avança para o início do próximo período
//     }
//     return periods;
//   }

//   // calculateMetricsForPeriods: Esta função não precisa de grandes alterações,
//   // pois já recebe os períodos pré-filtrados e todos os eventos para contagem.
//   private async calculateMetricsForPeriods(
//     driverExternalId: string,
//     periods: PeriodDefinition[],
//     infractionTypes: EventType[],
//     allEventsInWindow: any[]
//   ): Promise<EventCount[]> {
//     const metrics: EventCount[] = [];

//     for (const infractionType of infractionTypes) {
//       const eventCount: EventCount = {
//         eventType: infractionType.description,
//         counts: {},
//       };

//       let hasEventsForThisTypeInAnyPeriod = false;

//       for (const period of periods) {
//         // A contagem agora usa o período agrupado completo (startDate e endDate)
//         const count = this.countEventsInMemoryForGroupedPeriod(
//           allEventsInWindow,
//           infractionType.external_id.toString(),
//           period
//         );

//         eventCount.counts[period.id] = count;

//         if (count > 0) {
//           hasEventsForThisTypeInAnyPeriod = true;
//         }
//       }
//       if (hasEventsForThisTypeInAnyPeriod) {
//         metrics.push(eventCount);
//       }
//     }
//     return metrics;
//   }

//   // countEventsInMemoryForGroupedPeriod: Corrigido para usar o `_isEventInPeriod` que compara timestamps.
//   private countEventsInMemoryForGroupedPeriod(
//     allEvents: any[],
//     eventTypeExternalId: string,
//     period: PeriodDefinition
//   ): number {
//     return allEvents.filter(
//       event =>
//         event.event_type_external_id === eventTypeExternalId &&
//         this._isEventInPeriod(event, period.startDate, period.endDate)
//     ).length;
//   }

//   // --- Funções Auxiliares de Formatação ---

//   private formatReportDate(date: Date): string {
//     const options: Intl.DateTimeFormatOptions = {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//       timeZone: 'America/Sao_Paulo',
//     };
//     const formatter = new Intl.DateTimeFormat('pt-BR', options);
//     return `Brasília, ${formatter.format(date)}`;
//   }

//   private formatDateShort(date: Date): string {
//     const day = date.getUTCDate().toString().padStart(2, '0');
//     const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
//     const year = date.getUTCFullYear();
//     return `${day}.${month}.${year}`;
//   }

//   private formatDateIso(date: Date): string {
//     return date.toISOString().split('T')[0]; // YYYY-MM-DD
//   }

//   private formatDateIsoMonthYear(date: Date): string {
//     return date.toISOString().slice(0, 7); // YYYY-MM
//   }

//   private formatDateMonthYear(date: Date): string {
//     const options: Intl.DateTimeFormatOptions = {
//       year: 'numeric',
//       month: 'long',
//       timeZone: 'UTC', // Usa UTC para consistência
//     };
//     const formatter = new Intl.DateTimeFormat('pt-BR', options);
//     // Formata "setembro de 2025" para "Setembro/2025"
//     return formatter
//       .format(date)
//       .replace(/ de /, '/')
//       .replace(/^\w/, c => c.toUpperCase());
//   }

//   private _generatePeriodSummary(periods: PeriodDefinition[]): string {
//     if (periods.length === 0) {
//       return 'Nenhum período analisado.';
//     }
//     const labels = periods.map(p => p.label);
//     if (labels.length === 1) {
//       return `Período analisado: ${labels[0]}`;
//     }
//     // Junta os labels para o resumo. Para muitos períodos, pode ser útil truncar ou indicar "X períodos".
//     // Por enquanto, junta todos.
//     return `Períodos analisados: ${labels.join(', ')}`;
//   }
// }
// apps/backend/src/modules/performance/services/performanceReportService.ts
import { AppDataSource } from '@/data-source.js';
import { EventType } from '@/entities/event-type.entity.js';
import { DriverRepository } from '@/repositories/driver.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { logger } from '@/shared/utils/logger.js';
import { Repository } from 'typeorm';

// NOTA: Certifique-se que performanceReportQuerySchema (em performanceReport.schema.ts)
// tenha seu `max` ajustado para permitir a janela de busca desejada (ex: 365 para um ano).
// Ex: periodDays: z.coerce.number().int().min(1).max(365).optional().default(30),

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

// Enum para as estratégias de agrupamento
enum GroupingStrategy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
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
    reportDetailsReferenceDate: Date // Data usada para formatar o reportDateFormatted
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
    const eventTypeIds = infractionTypes.map(t => t.external_id.toString());

    const allEventsInWindow = await this.telemetryEventRepository.repository
      .createQueryBuilder('event')
      .select(['event.event_type_external_id', 'event.occurred_at'])
      .where('event.driver_external_id = :driverExternalId', {
        driverExternalId: String(driver.external_id),
      })
      .andWhere('event.event_type_external_id IN (:...eventTypeIds)', { eventTypeIds })
      .andWhere('event.occurred_at >= :windowStartDate', { windowStartDate })
      .andWhere('event.occurred_at <= :windowEndDate', { windowEndDate })
      .getMany();

    if (allEventsInWindow.length === 0) {
      return this._buildEmptyReport(driver, reportDetailsReferenceDate);
    }

    const requestedWindowDays = this._getDaysDifference(windowStartDate, windowEndDate);
    let effectiveGroupingStrategy = this._getGroupingStrategy(requestedWindowDays);

    const minEventDate = new Date(Math.min(...allEventsInWindow.map(e => e.occurred_at.getTime())));
    const maxEventDate = new Date(Math.max(...allEventsInWindow.map(e => e.occurred_at.getTime())));
    const actualEventSpanDays = this._getDaysDifference(minEventDate, maxEventDate);

    if (actualEventSpanDays <= 7) {
      effectiveGroupingStrategy = GroupingStrategy.DAY;
      logger.info(
        `Forçando agrupamento por DIA pois o span real de eventos (${actualEventSpanDays} dias) é <= 7.`
      );
    }

    logger.info(`Estratégia de agrupamento final: ${effectiveGroupingStrategy}.`);

    const groupedPeriods = this._generateGroupedPeriods(
      windowStartDate,
      windowEndDate,
      effectiveGroupingStrategy,
      allEventsInWindow
    );

    groupedPeriods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    const metrics = await this.calculateMetricsForPeriods(
      String(driver.external_id),
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

  // ✅ Método original `generatePerformanceReport` adaptado
  public async generatePerformanceReport(
    driverId: number,
    reportDate?: string,
    searchWindowDays: number = 30
  ) {
    let effectiveReferenceDate: Date;
    if (reportDate) {
      const [year, month, day] = reportDate.split('-').map(Number);
      effectiveReferenceDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      const now = new Date();
      effectiveReferenceDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
    }

    const windowEndDate = new Date(effectiveReferenceDate);
    windowEndDate.setUTCHours(23, 59, 59, 999);

    const windowStartDate = new Date(effectiveReferenceDate);
    windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (searchWindowDays - 1));
    windowStartDate.setUTCHours(0, 0, 0, 0);

    return this._processAndGenerateReport(
      driverId,
      windowStartDate,
      windowEndDate,
      effectiveReferenceDate
    );
  }

  // ✅ NOVO MÉTODO: `generatePerformanceReportByDateRange`
  public async generatePerformanceReportByDateRange(
    driverId: number,
    startDateString: string,
    endDateString: string
  ) {
    logger.info(
      `Gerando relatório de performance para motorista ID: ${driverId} no intervalo ${startDateString} a ${endDateString}`
    );

    // Garante que as datas são tratadas como UTC, começando/terminando o dia.
    const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);
    const windowStartDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    windowStartDate.setUTCHours(0, 0, 0, 0);

    const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
    const windowEndDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    windowEndDate.setUTCHours(23, 59, 59, 999);

    if (windowStartDate.getTime() > windowEndDate.getTime()) {
      throw new InvalidDateRangeError();
    }

    // A data de referência para o reportDateFormatted será a data final do período
    const reportDetailsReferenceDate = windowEndDate;

    return this._processAndGenerateReport(
      driverId,
      windowStartDate,
      windowEndDate,
      reportDetailsReferenceDate
    );
  }

  // --- Funções Auxiliares para o Agrupamento Inteligente ---

  private _getDaysDifference(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    // Adiciona 1 dia para incluir o dia de início na contagem do intervalo
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private _getGroupingStrategy(daysDifference: number): GroupingStrategy {
    if (daysDifference <= 7) {
      return GroupingStrategy.DAY;
    } else if (daysDifference <= 30) {
      return GroupingStrategy.WEEK;
    } else if (daysDifference <= 90) {
      return GroupingStrategy.MONTH;
    } else {
      return GroupingStrategy.QUARTER;
    }
  }

  // Helper para verificar se um evento ocorre dentro de um período UTC
  private _isEventInPeriod(event: any, periodStartDate: Date, periodEndDate: Date): boolean {
    const eventOccurredAt = new Date(event.occurred_at);
    // Verificar se o evento está DENTRO ou NOS LIMITES do período
    return (
      eventOccurredAt.getTime() >= periodStartDate.getTime() &&
      eventOccurredAt.getTime() <= periodEndDate.getTime()
    );
  }

  private _generateGroupedPeriods(
    windowStartDate: Date,
    windowEndDate: Date,
    strategy: GroupingStrategy,
    allEvents: any[]
  ): PeriodDefinition[] {
    const periods: PeriodDefinition[] = [];
    let currentGroupStart = new Date(windowStartDate);

    while (currentGroupStart <= windowEndDate) {
      let periodEndDate: Date;
      let id: string;
      let label: string;
      let nextGroupStart = new Date(currentGroupStart); // Usado para avançar o loop

      switch (strategy) {
        case GroupingStrategy.DAY:
          periodEndDate = new Date(currentGroupStart);
          periodEndDate.setUTCHours(23, 59, 59, 999);
          id = `dia-${this.formatDateIso(currentGroupStart)}`;
          label = this.formatDateShort(currentGroupStart);
          nextGroupStart.setUTCDate(nextGroupStart.getUTCDate() + 1);
          break;

        case GroupingStrategy.WEEK:
          // Ajusta para o início da semana (domingo) que contém currentGroupStart
          const startOfWeek = new Date(
            Date.UTC(
              currentGroupStart.getUTCFullYear(),
              currentGroupStart.getUTCMonth(),
              currentGroupStart.getUTCDate() - currentGroupStart.getUTCDay()
            )
          );
          periodEndDate = new Date(startOfWeek);
          periodEndDate.setUTCDate(startOfWeek.getUTCDate() + 6); // Fim da semana (sábado)
          periodEndDate.setUTCHours(23, 59, 59, 999);

          id = `semana-${this.formatDateShort(startOfWeek).replace(/\./g, '')}_${this.formatDateShort(periodEndDate).replace(/\./g, '')}`; // Ex: semana-21092025_27092025
          label = `Semana ${this.formatDateShort(startOfWeek)} a ${this.formatDateShort(periodEndDate)}`;

          currentGroupStart = startOfWeek; // Usa o início da semana real para o período
          nextGroupStart.setUTCDate(startOfWeek.getUTCDate() + 7); // Próxima semana
          break;

        case GroupingStrategy.MONTH:
          // Ajusta para o início do mês que contém currentGroupStart
          const startOfMonth = new Date(
            Date.UTC(currentGroupStart.getUTCFullYear(), currentGroupStart.getUTCMonth(), 1)
          );
          periodEndDate = new Date(
            startOfMonth.getUTCFullYear(),
            startOfMonth.getUTCMonth() + 1,
            0
          ); // Último dia do mês
          periodEndDate.setUTCHours(23, 59, 59, 999);

          id = `mes-${this.formatDateIsoMonthYear(startOfMonth)}`;
          label = this.formatDateMonthYear(startOfMonth);

          currentGroupStart = startOfMonth; // Usa o início do mês real para o período
          nextGroupStart.setUTCMonth(startOfMonth.getUTCMonth() + 1); // Próximo mês
          break;

        case GroupingStrategy.QUARTER:
          const currentMonth = currentGroupStart.getUTCMonth();
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, 9
          const startOfQuarter = new Date(
            Date.UTC(currentGroupStart.getUTCFullYear(), quarterStartMonth, 1)
          );

          periodEndDate = new Date(startOfQuarter.getUTCFullYear(), quarterStartMonth + 3, 0); // Último dia do trimestre
          periodEndDate.setUTCHours(23, 59, 59, 999);

          const quarterNumber = Math.floor(quarterStartMonth / 3) + 1;
          id = `trimestre-${startOfQuarter.getUTCFullYear()}-Q${quarterNumber}`;
          label = `Trimestre ${quarterNumber}/${startOfQuarter.getUTCFullYear()}`;

          currentGroupStart = startOfQuarter; // Usa o início do trimestre real para o período
          nextGroupStart.setUTCMonth(startOfQuarter.getUTCMonth() + 3); // Próximo trimestre
          break;

        default:
          throw new Error('Estratégia de agrupamento desconhecida.');
      }

      // Garante que o período gerado não ultrapasse a windowEndDate para o cálculo dos eventos
      const actualPeriodEndDateForCounting = new Date(
        Math.min(periodEndDate.getTime(), windowEndDate.getTime())
      );
      const actualPeriodStartDateForCounting = new Date(
        Math.max(currentGroupStart.getTime(), windowStartDate.getTime())
      );

      const hasEventsInThisPeriod = allEvents.some(event =>
        this._isEventInPeriod(
          event,
          actualPeriodStartDateForCounting,
          actualPeriodEndDateForCounting
        )
      );

      // Adiciona o período APENAS se ele contiver eventos.
      if (hasEventsInThisPeriod) {
        periods.push({
          id,
          label,
          startDate: new Date(currentGroupStart), // A data de início real do período (domingo/dia 1/etc)
          endDate: new Date(periodEndDate), // A data de fim real do período
          date: new Date(
            currentGroupStart.getTime() +
              (periodEndDate.getTime() - currentGroupStart.getTime()) / 2
          ), // Meio do período
        });
      }

      currentGroupStart = nextGroupStart; // Avança para o início do próximo período
    }
    return periods;
  }

  private async calculateMetricsForPeriods(
    driverExternalId: string,
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
        // A contagem agora usa o período agrupado completo (startDate e endDate)
        const count = this.countEventsInMemoryForGroupedPeriod(
          allEventsInWindow,
          infractionType.external_id.toString(),
          period
        );

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

  private countEventsInMemoryForGroupedPeriod(
    allEvents: any[],
    eventTypeExternalId: string,
    period: PeriodDefinition
  ): number {
    return allEvents.filter(
      event =>
        event.event_type_external_id === eventTypeExternalId &&
        this._isEventInPeriod(event, period.startDate, period.endDate)
    ).length;
  }

  // --- Funções Auxiliares de Formatação ---

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
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  private formatDateIso(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private formatDateIsoMonthYear(date: Date): string {
    return date.toISOString().slice(0, 7); // YYYY-MM
  }

  private formatDateMonthYear(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC', // Usa UTC para consistência
    };
    const formatter = new Intl.DateTimeFormat('pt-BR', options);
    // Formata "setembro de 2025" para "Setembro/2025"
    return formatter
      .format(date)
      .replace(/ de /, '/')
      .replace(/^\w/, c => c.toUpperCase());
  }

  private _generatePeriodSummary(periods: PeriodDefinition[]): string {
    if (periods.length === 0) {
      return 'Nenhum período analisado.';
    }
    const labels = periods.map(p => p.label);
    if (labels.length === 1) {
      return `Período analisado: ${labels[0]}`;
    }
    // Junta os labels para o resumo. Para muitos períodos, pode ser útil truncar ou indicar "X períodos".
    // Por enquanto, junta todos.
    return `Períodos analisados: ${labels.join(', ')}`;
  }
}
