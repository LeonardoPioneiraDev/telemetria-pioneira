// src/services/etl.service.ts

import { api } from '@/lib/api';
import { APIResponse, ETLMetrics, ETLStatus, JobHistory } from '@/types/etl';

export const etlService = {
  /**
   * Obtém o status geral do ETL
   */
  async getStatus(): Promise<ETLStatus> {
    const response = await api.get<APIResponse<ETLStatus>>('/etl/status');
    return response.data.data;
  },

  /**
   * Obtém métricas detalhadas do ETL
   */
  async getMetrics(days: number = 7): Promise<ETLMetrics> {
    const response = await api.get<APIResponse<ETLMetrics>>('/etl/metrics', {
      params: { days },
    });
    return response.data.data;
  },

  /**
   * Obtém histórico de execuções
   */
  async getHistory(limit: number = 20): Promise<JobHistory[]> {
    const response = await api.get<APIResponse<JobHistory[]>>('/etl/history', {
      params: { limit },
    });
    return response.data.data;
  },

  /**
   * Health check do ETL
   */
  async getHealth(): Promise<any> {
    const response = await api.get('/etl/health');
    return response.data;
  },
};
