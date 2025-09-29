// apps/telemetria-web/src/services/telemetry.service.ts
import { api } from '@/lib/api';
import { Driver, PerformanceReportResponse } from '@/types/api';
import { format } from 'date-fns';

export const searchDrivers = async (query: string): Promise<Driver[]> => {
  if (!query) return [];

  const response = await api.get<Driver[]>(`/drivers?search=${query}`);
  return response.data;
};

export const getPerformanceReport = async (
  driverId: number,
  reportDate?: Date
): Promise<PerformanceReportResponse> => {
  let url = `/drivers/${driverId}/performance-report`;

  if (reportDate) {
    // Formata a data para YYYY-MM-DD para enviar à API
    const formattedDate = format(reportDate, 'yyyy-MM-dd');
    url += `?reportDate=${formattedDate}`;
  }

  const response = await api.get<PerformanceReportResponse>(url);
  return response.data;
};
