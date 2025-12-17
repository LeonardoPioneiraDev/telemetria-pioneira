'use client';

import { userActivityService } from '@/services/user-activity.service';
import type { TimeRange } from '@/types/metrics';
import type {
  SortByField,
  SortOrder,
  UserActivityRankingFilters,
  UserActivityRankingResponse,
} from '@/types/user-activity';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

interface UseUserActivityRankingOptions {
  initialTimeRange?: TimeRange;
  initialSortBy?: SortByField;
  initialSortOrder?: SortOrder;
  initialLimit?: number;
}

export function useUserActivityRanking(options?: UseUserActivityRankingOptions) {
  const [filters, setFilters] = useState<UserActivityRankingFilters>({
    timeRange: options?.initialTimeRange || 'last_7d',
    sortBy: options?.initialSortBy || 'lastLogin',
    sortOrder: options?.initialSortOrder || 'desc',
    page: 1,
    limit: options?.initialLimit || 20,
  });

  const query = useQuery<UserActivityRankingResponse>({
    queryKey: ['userActivityRanking', filters],
    queryFn: () => userActivityService.getUserActivityRanking(filters),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setFilters(prev => ({ ...prev, timeRange, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setRole = useCallback((role: string | undefined) => {
    setFilters(prev => ({ ...prev, role, page: 1 }));
  }, []);

  const setSortBy = useCallback((sortBy: SortByField) => {
    setFilters(prev => ({ ...prev, sortBy, page: 1 }));
  }, []);

  const setSortOrder = useCallback((sortOrder: SortOrder) => {
    setFilters(prev => ({ ...prev, sortOrder, page: 1 }));
  }, []);

  const toggleSortOrder = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    filters,
    setTimeRange,
    setSearch,
    setRole,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    setPage,
    setLimit,
  };
}
