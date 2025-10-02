// apps/frontend/src/hooks/etl/useETLHistory.ts

import { etlService } from '@/services/etl.service';
import { JobHistory } from '@/types/etl';
import { useQuery } from '@tanstack/react-query';

interface UseETLHistoryOptions {
  limit?: number;
  enabled?: boolean;
}

export const useETLHistory = (options?: UseETLHistoryOptions) => {
  const limit = options?.limit ?? 20;

  return useQuery<JobHistory[]>({
    queryKey: ['etl-history', limit],
    queryFn: () => etlService.getHistory(limit),
    enabled: options?.enabled ?? true,
    staleTime: 30000, // 30 segundos
    retry: 2,
  });
};
