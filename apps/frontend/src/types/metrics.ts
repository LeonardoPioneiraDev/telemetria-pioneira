export type TimeRange = 'last_hour' | 'last_3h' | 'last_6h' | 'last_24h' | 'last_7d' | 'last_30d';

export interface MetricsSummary {
  totalRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  uniqueUsers: number;
  uniqueLoggedInUsers: number;
  timeRange: TimeRange;
}

export interface RequestsOverTimeData {
  timestamp: string;
  requestCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  [key: string]: string | number;
}

export interface StatusCodeDistribution {
  statusGroup: string;
  count: number;
  [key: string]: string | number;
}

export interface StatusCodeDetail {
  statusCode: number;
  statusGroup: string;
  description: string;
  count: number;
  percentage: number;
}

export interface TopUser {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  requestCount: number;
  activeDays: number;
}

export interface SlowestEndpoint {
  endpoint: string;
  method: string;
  requestCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
}

export interface DailyPeak {
  date: string;
  totalRequests: number;
  peakHour: number;
  peakHourRequests: number;
  [key: string]: string | number;
}

export interface PlatformDistribution {
  deviceType: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

export interface OperatingSystemDistribution {
  os: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

export interface BrowserDistribution {
  browser: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

export interface DashboardMetricsResponse {
  summary: MetricsSummary;
  charts: {
    requestsOverTime: RequestsOverTimeData[];
    statusDistribution: StatusCodeDistribution[];
    statusCodeDetails: StatusCodeDetail[];
    dailyPeaks: DailyPeak[];
  };
  rankings: {
    topUsers: TopUser[];
    slowestEndpoints: SlowestEndpoint[];
  };
  platform: {
    devices: PlatformDistribution[];
    operatingSystems: OperatingSystemDistribution[];
    browsers: BrowserDistribution[];
  };
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  last_hour: 'Última hora',
  last_3h: 'Últimas 3 horas',
  last_6h: 'Últimas 6 horas',
  last_24h: 'Últimas 24 horas',
  last_7d: 'Últimos 7 dias',
  last_30d: 'Últimos 30 dias',
};
