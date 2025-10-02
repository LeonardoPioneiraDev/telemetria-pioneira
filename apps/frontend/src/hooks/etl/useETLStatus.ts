// apps/frontend/src/hooks/etl/useETLStatus.ts

import { etlService } from '@/services/etl.service';
import { ETLStatus } from '@/types/etl';
import { useQuery } from '@tanstack/react-query';

interface UseETLStatusOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export const useETLStatus = (options?: UseETLStatusOptions) => {
  return useQuery<ETLStatus>({
    queryKey: ['etl-status'],
    queryFn: () => etlService.getStatus(),
    refetchInterval: options?.refetchInterval ?? 30000, // 30 segundos por padrão
    enabled: options?.enabled ?? true,
    staleTime: 20000, // 20 segundos
    retry: 2,
  });
};
