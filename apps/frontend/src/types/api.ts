// apps/telemetria-web/src/types/api.ts

/**
 * Representa a estrutura da resposta da API de autenticação.
 * POST: /api/auth/login
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

/**
 * Representa um único motorista na lista de busca.
 * GET: /api/drivers?search=...
 */
export interface Driver {
  id: number;
  name: string;
  employee_number: string;
}

/**
 * Representa as informações básicas do motorista no relatório.
 */
export interface DriverInfo {
  id: number;
  name: string;
  badge: string;
}

/**
 * Representa os detalhes textuais do relatório.
 */
export interface ReportDetails {
  reportDateFormatted: string;
  periodSummary: string;
  acknowledgmentText: string;
}

/**
 * Representa um período de tempo (seja um intervalo ou um dia específico).
 */
export interface PerformancePeriod {
  id: string;
  label: string;
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
  date?: string; // ISO 8601 date string, for single days
}

/**
 * Representa uma métrica de desempenho com suas contagens por período.
 */
export interface PerformanceMetric {
  eventType: string;
  counts: {
    [periodId: string]: number; // Mapeia o 'id' de PerformancePeriod para uma contagem
  };
}

/**
 * Representa a estrutura completa da resposta do relatório de desempenho.
 * GET: /drivers/{id}/performance-report
 */
export interface PerformanceReportResponse {
  driverInfo: DriverInfo;
  reportDetails: ReportDetails;
  performanceSummary: {
    periods: PerformancePeriod[];
    metrics: PerformanceMetric[];
    totalEvents: number;
  };
}
