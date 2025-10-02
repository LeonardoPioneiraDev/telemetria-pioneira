// apps/frontend/src/hooks/etl/useETLMetrics.ts

import { etlService } from '@/services/etl.service';
import { ETLMetrics } from '@/types/etl';
import { useQuery } from '@tanstack/react-query';

interface UseETLMetricsOptions {
  days?: number;
  enabled?: boolean;
}

export const useETLMetrics = (options?: UseETLMetricsOptions) => {
  const days = options?.days ?? 7;

  return useQuery<ETLMetrics>({
    queryKey: ['etl-metrics', days],
    queryFn: () => etlService.getMetrics(days),
    enabled: options?.enabled ?? true,
    staleTime: 60000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
};
