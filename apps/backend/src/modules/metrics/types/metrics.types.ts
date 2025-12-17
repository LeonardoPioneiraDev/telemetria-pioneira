export type TimeRange = 'last_hour' | 'last_3h' | 'last_6h' | 'last_24h' | 'last_7d' | 'last_30d';

export interface DashboardMetrics {
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
}

export interface StatusCodeDistribution {
  statusGroup: string;
  count: number;
}

export interface StatusCodeDetail {
  statusCode: number;
  statusGroup: string;
  description: string;
  count: number;
  percentage: number;
}

export interface TopUserByActivity {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  requestCount: number;
  activeDays: number;
}

export interface EndpointLatencyRanking {
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
}

export interface PlatformDistribution {
  deviceType: string;  // Desktop, Mobile, Tablet
  count: number;
  percentage: number;
}

export interface OperatingSystemDistribution {
  os: string;  // Windows, macOS, Linux, Android, iOS
  count: number;
  percentage: number;
}

export interface BrowserDistribution {
  browser: string;  // Chrome, Firefox, Safari, Edge, etc
  count: number;
  percentage: number;
}

export interface RequestLogData {
  requestId: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  routePattern: string | null;
  userId: string | null;
  userRole: string | null;
  statusCode: number;
  latencyMs: number;
  responseSizeBytes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  errorCode: string | null;
}

export interface DashboardResponse {
  summary: DashboardMetrics;
  charts: {
    requestsOverTime: RequestsOverTimeData[];
    statusDistribution: StatusCodeDistribution[];
    statusCodeDetails: StatusCodeDetail[];
    dailyPeaks: DailyPeak[];
  };
  rankings: {
    topUsers: TopUserByActivity[];
    slowestEndpoints: EndpointLatencyRanking[];
  };
  platform: {
    devices: PlatformDistribution[];
    operatingSystems: OperatingSystemDistribution[];
    browsers: BrowserDistribution[];
  };
}
