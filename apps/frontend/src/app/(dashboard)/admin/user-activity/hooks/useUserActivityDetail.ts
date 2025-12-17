'use client';

import { userActivityService } from '@/services/user-activity.service';
import type { TimeRange } from '@/types/metrics';
import type { UserActivityDetailResponse } from '@/types/user-activity';
import { useQuery } from '@tanstack/react-query';

export function useUserActivityDetail(
  userId: string | null,
  timeRange: TimeRange = 'last_30d'
) {
  return useQuery<UserActivityDetailResponse | null>({
    queryKey: ['userActivityDetail', userId, timeRange],
    queryFn: async () => {
      if (!userId) return null;
      return userActivityService.getUserActivityDetail(userId, timeRange);
    },
    enabled: userId !== null,
    staleTime: 30 * 1000,
  });
}
