// src/types/etl.ts

export type ETLStatusType = 'running' | 'idle' | 'error' | 'circuit_breaker_open' | 'unknown';

export interface ETLLastSync {
  token: string;
  timestamp: string;
  ageInMinutes: number;
}

export interface ETLTodayStats {
  totalEvents: number;
  totalPages: number;
  eventsPerHour: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
}

export interface ETLTokenInfo {
  current: string;
  ageInHours: number;
  isExpiringSoon: boolean;
  expiresIn: string;
  daysUntilExpiry: number;
}

export interface ETLWorkerStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
}

export interface ETLWorkersInfo {
  eventIngestion: ETLWorkerStats;
  masterDataSync: ETLWorkerStats;
}

export interface ETLPerformance {
  avgEventsPerMinute: number;
  totalEventsAllTime: number;
  oldestEvent: string | null;
  newestEvent: string | null;
}

export interface ETLStatus {
  status: ETLStatusType;
  lastSync: ETLLastSync | null;
  today: ETLTodayStats;
  tokenInfo: ETLTokenInfo;
  workers: ETLWorkersInfo;
  performance: ETLPerformance;
}

export interface HourlyMetric {
  hour: string;
  events: number;
}

export interface DailyMetric {
  date: string;
  events: number;
}

export interface TopItem {
  eventTypeId?: string;
  driverId?: string;
  vehicleId?: string;
  count?: number;
  eventCount?: number;
}

export interface ETLMetrics {
  hourly: HourlyMetric[];
  daily: DailyMetric[];
  topEventTypes: TopItem[];
  topDrivers: TopItem[];
  topVehicles: TopItem[];
}

export interface JobHistory {
  id?: string;
  status: 'completed' | 'failed';
  processedOn: number | null;
  finishedOn: number | null;
  duration?: number | null;
  returnValue?: any;
  failedReason?: string;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
