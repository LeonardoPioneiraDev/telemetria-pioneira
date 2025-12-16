'use client';

import { metricsService } from '@/services/metrics.service';
import { DashboardMetricsResponse, TimeRange } from '@/types/metrics';
import { useQuery } from '@tanstack/react-query';

export function useMetrics(timeRange: TimeRange) {
  return useQuery<DashboardMetricsResponse>({
    queryKey: ['metrics', 'dashboard', timeRange],
    queryFn: () => metricsService.getDashboardMetrics(timeRange),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
