// apps/backend/src/modules/performance/services/performanceReportService.ts
import { AppDataSource } from '@/data-source.js';
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
  date: Date; // A data central do dia para referência
}

interface EventCount {
  eventType: string;
  counts: Record<string, number>;
}

// Melhoria: Erro customizado para melhor tratamento
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

  public async generatePerformanceReport(
    driverId: number,
    reportDate?: string,
    searchWindowDays: number = 30 // Renomeado para maior clareza: define a janela de busca, não o número de períodos a serem gerados
  ) {
    logger.info(`Gerando relatório de performance para motorista ID: ${driverId}`);

    const driver = await this.driverRepository.findById(driverId);
    if (!driver) {
      throw new DriverNotFoundError();
    }

    // Garante que effectiveReferenceDate seja o início do dia em UTC.
    // Ex: '2025-09-25' se torna 2025-09-25T00:00:00.000Z
    let effectiveReferenceDate: Date;
    if (reportDate) {
      const [year, month, day] = reportDate.split('-').map(Number);
      // Date.UTC espera o mês 0-indexado
      effectiveReferenceDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      // Se reportDate não for fornecido, usa a data atual do servidor em UTC
      const now = new Date();
      effectiveReferenceDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
    }

    // 1. Define a janela de tempo máxima para buscar eventos.
    // Esta janela é para os últimos `searchWindowDays` dias *incluindo* o `effectiveReferenceDate`.
    const windowEndDate = new Date(effectiveReferenceDate);
    windowEndDate.setUTCHours(23, 59, 59, 999); // Fim do dia da data de referência em UTC

    const windowStartDate = new Date(effectiveReferenceDate);
    windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (searchWindowDays - 1));
    windowStartDate.setUTCHours(0, 0, 0, 0); // Início do dia para a data mais antiga na janela

    // 2. Buscar tipos de evento de infração
    const infractionTypes = await this.eventTypeRepository.find({
      where: { classification: 'Infração de Condução' },
      order: { description: 'ASC' },
    });
    const eventTypeIds = infractionTypes.map(t => t.external_id.toString());

    // 3. Buscar **todos** os eventos relevantes para o motorista dentro da janela definida.
    // Isso é otimizado para uma única consulta ao DB.
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

    // 4. Identificar os dias UTC únicos que possuem eventos reais.
    const uniqueEventDaysUTC = new Set<string>(); // Armazena strings 'YYYY-MM-DD' em UTC
    for (const event of allEventsInWindow) {
      const eventUtcDate = event.occurred_at.toISOString().split('T')[0]; // Extrai 'YYYY-MM-DD' UTC
      uniqueEventDaysUTC.add(eventUtcDate);
    }

    // 5. Gerar PeriodDefinitions **APENAS** para os dias que realmente têm eventos.
    const periods: PeriodDefinition[] = [];
    const sortedUniqueDays = Array.from(uniqueEventDaysUTC).sort(); // Ordena cronologicamente crescente

    for (const dayString of sortedUniqueDays) {
      const currentDayUTC = new Date(dayString + 'T00:00:00.000Z'); // Início do dia UTC

      // Embora já tenhamos filtrado pela janela na query, este é um double-check
      // e garante que a data está dentro do contexto da referência (se `uniqueEventDaysUTC` tivesse dados mais antigos que a janela, por exemplo).
      if (
        currentDayUTC.getTime() >= windowStartDate.getTime() &&
        currentDayUTC.getTime() <= windowEndDate.getTime()
      ) {
        const startOfDay = currentDayUTC; // Já é 00:00:00.000Z
        const endOfDay = new Date(currentDayUTC);
        endOfDay.setUTCHours(23, 59, 59, 999); // Fim do dia UTC

        periods.push({
          id: `date-${dayString}`, // ID mais descritivo
          label: this.formatDateShort(currentDayUTC), // Label formatado em DD.MM.YYYY UTC
          date: new Date(currentDayUTC.getTime() + 12 * 60 * 60 * 1000), // Meio-dia UTC para referência
          startDate: startOfDay,
          endDate: endOfDay,
        });
      }
    }
    // O relatório é geralmente exibido do mais recente para o mais antigo, vamos reverter a ordem.
    periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    // 6. Calcular métricas para os períodos que realmente contêm dados.
    const metrics = await this.calculateMetricsForPeriods(
      String(driver.external_id),
      periods, // Apenas períodos com eventos reais
      infractionTypes
    );

    // 7. Calcular total de eventos (agora apenas dos dias com dados)
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
        reportDateFormatted: this.formatReportDate(effectiveReferenceDate),
        periodSummary: this.generatePeriodSummary(periods), // Apenas períodos com eventos reais
        acknowledgmentText:
          'O empregado foi orientado quanto ao desempenho registrado pela telemetria, com revisão de procedimentos e esclarecimento de dúvidas. Reconhece a importância da ferramenta como apoio à segurança, à eficiência operacional e à preservação da frota.',
      },
      performanceSummary: {
        periods: periods.map(p => ({
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

  // --- Funções Auxiliares (mantidas ou com pequenas melhorias) ---

  // calculateMetricsForPeriods -> Inalterado, pois a lógica de contagem em memória é eficiente
  private async calculateMetricsForPeriods(
    driverExternalId: string,
    periods: PeriodDefinition[],
    infractionTypes: EventType[]
  ): Promise<EventCount[]> {
    // allEventsInWindow já foi buscado no generatePerformanceReport
    // No entanto, para manter a modularidade e não passar "allEventsInWindow" por todo lado,
    // podemos fazer uma pequena modificação para que countEventsInMemory receba os eventos
    // diretamente ou refatorar para que calculateMetricsForPeriods receba allEventsInWindow.
    // Por enquanto, vamos manter a chamada a getAllEventsForPeriods, mas saiba que está buscando
    // o mesmo range de dados (o que pode ser otimizado se allEventsInWindow for passado para cá).

    // Otimização: A `allEventsInWindow` já foi obtida no método principal.
    // Passá-la como argumento aqui evitaria uma nova query, mas requer um ajuste na assinatura.
    // Por simplicidade e clareza, para este exemplo, o `getAllEventsForPeriods` vai ser chamado,
    // mas em um sistema de alta performance, eu passaria `allEventsInWindow` diretamente.
    const allEventsForCounting = await this.getAllEventsForPeriods(
      driverExternalId,
      periods,
      infractionTypes
    );

    const metrics: EventCount[] = [];

    for (const infractionType of infractionTypes) {
      const eventCount: EventCount = {
        eventType: infractionType.description,
        counts: {},
      };

      let hasEventsForThisType = false; // Flag para incluir a métrica apenas se houver contagens > 0

      for (const period of periods) {
        const count = this.countEventsInMemory(
          allEventsForCounting, // Usando os eventos já buscados
          infractionType.external_id.toString(),
          period
        );

        eventCount.counts[period.id] = count;

        if (count > 0) {
          hasEventsForThisType = true;
        }
      }
      if (hasEventsForThisType) {
        // Inclui a métrica apenas se houver algum evento para o tipo em qualquer período
        metrics.push(eventCount);
      }
    }
    return metrics;
  }

  // getAllEventsForPeriods: Este método agora só é chamado *dentro* de calculateMetricsForPeriods
  // Ele vai buscar novamente os eventos, mas de um range menor (apenas dos `periods` filtrados).
  // Se você deseja otimização máxima, `calculateMetricsForPeriods` deveria receber `allEventsInWindow`
  // do `generatePerformanceReport` principal.
  private async getAllEventsForPeriods(
    driverExternalId: string,
    periods: PeriodDefinition[],
    infractionTypes: EventType[]
  ): Promise<any[]> {
    if (periods.length === 0) {
      // Se não há períodos com dados, retorna vazio
      return [];
    }
    const allDates = periods.flatMap(p => [p.startDate, p.endDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const eventTypeIds = infractionTypes.map(t => t.external_id.toString());

    if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
      // Proteção contra datas inválidas
      return [];
    }

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

  // countEventsInMemory -> Inalterado, a lógica está correta para filtrar em memória
  private countEventsInMemory(
    allEvents: any[],
    eventTypeExternalId: string,
    period: PeriodDefinition
  ): number {
    return allEvents.filter(
      event =>
        event.event_type_external_id === eventTypeExternalId &&
        event.occurred_at >= period.startDate &&
        event.occurred_at <= period.endDate
    ).length;
  }

  // formatReportDate -> Inalterado, usa Intl.DateTimeFormat para fuso horário de Brasília na exibição
  private formatReportDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo', // Fuso horário de Brasília
    };
    const formatter = new Intl.DateTimeFormat('pt-BR', options);
    return `Brasília, ${formatter.format(date)}`;
  }

  // formatDateShort -> Inalterado, usa métodos UTC para consistência
  private formatDateShort(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  // generatePeriodSummary -> Ajustado para refletir os períodos reais com dados
  private generatePeriodSummary(periods: PeriodDefinition[]): string {
    if (periods.length === 0) {
      return 'Nenhum período analisado.';
    }
    // Ordena para exibir do dia mais antigo para o mais recente no resumo
    const sortedPeriods = [...periods].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
    const labels = sortedPeriods.map(p => p.label);

    if (labels.length === 1) {
      return `Período analisado: ${labels[0]}`;
    }

    // Se houver mais de um dia, a string de resumo será "Dia1, Dia2, ..., DiaN"
    return `Períodos analisados: ${labels.join(', ')}`;
  }
}
