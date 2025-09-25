// apps/telemetria-web/src/services/telemetry.service.ts
import { api } from '@/lib/api';
import { Driver, PerformanceReportResponse } from '@/types/api'; // Adicione PerformanceReportResponse

export const searchDrivers = async (query: string): Promise<Driver[]> => {
  if (!query) return [];

  const response = await api.get<Driver[]>(`/drivers?search=${query}`);
  return response.data;
};

// --- ADICIONE ESTA FUNÇÃO ---
export const getPerformanceReport = async (
  driverId: number
): Promise<PerformanceReportResponse> => {
  const response = await api.get<PerformanceReportResponse>(
    `/drivers/${driverId}/performance-report`
  );
  return response.data;
};
