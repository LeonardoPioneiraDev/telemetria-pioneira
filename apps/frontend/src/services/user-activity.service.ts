import { api } from '@/lib/api';
import type { TimeRange } from '@/types/metrics';
import type {
  APIResponse,
  PageViewRequest,
  PageViewResponse,
  UserActivityDetailResponse,
  UserActivityRankingFilters,
  UserActivityRankingResponse,
} from '@/types/user-activity';

export const userActivityService = {
  /**
   * GET /api/admin/metrics/users
   * Retorna ranking de atividade de usuários
   */
  async getUserActivityRanking(
    filters: UserActivityRankingFilters
  ): Promise<UserActivityRankingResponse> {
    const params: Record<string, string | number> = {
      timeRange: filters.timeRange,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.role) {
      params.role = filters.role;
    }

    if (filters.search) {
      params.search = filters.search;
    }

    const response = await api.get<APIResponse<UserActivityRankingResponse>>(
      '/admin/metrics/users',
      { params }
    );
    return response.data.data;
  },

  /**
   * GET /api/admin/metrics/users/:id
   * Retorna detalhes de atividade de um usuário específico
   */
  async getUserActivityDetail(
    userId: string,
    timeRange: TimeRange
  ): Promise<UserActivityDetailResponse> {
    const response = await api.get<APIResponse<UserActivityDetailResponse>>(
      `/admin/metrics/users/${userId}`,
      { params: { timeRange } }
    );
    return response.data.data;
  },

  /**
   * POST /api/metrics/page-view
   * Registra visualização de página (fire-and-forget)
   */
  async logPageView(data: PageViewRequest): Promise<PageViewResponse> {
    try {
      const response = await api.post<PageViewResponse>('/metrics/page-view', data);
      return response.data;
    } catch {
      // Silently fail - page tracking should not block navigation
      return {
        success: false,
        message: 'Failed to log page view',
        timestamp: new Date().toISOString(),
      };
    }
  },
};
