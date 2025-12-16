import { api } from '@/lib/api';
import { APIResponse, DashboardMetricsResponse, TimeRange } from '@/types/metrics';

export const metricsService = {
  async getDashboardMetrics(timeRange: TimeRange): Promise<DashboardMetricsResponse> {
    const response = await api.get<APIResponse<DashboardMetricsResponse>>(
      '/admin/metrics/dashboard',
      { params: { timeRange } }
    );
    return response.data.data;
  },
};
