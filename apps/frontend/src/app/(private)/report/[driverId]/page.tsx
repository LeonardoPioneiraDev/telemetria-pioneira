// apps/telemetria-web/src/app/(private)/report/[driverId]/page.tsx
'use client';

import { getPerformanceReport } from '@/services/telemetry.service';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { PerformanceChart } from '@/components/report/PerformanceChart';
import { PerformanceTable } from '@/components/report/PerformanceTable';
import { ReportHeader } from '@/components/report/ReportHeader';
import { ReportActions } from '@/components/printable/ReportActions';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.driverId ? parseInt(params.driverId as string, 10) : 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['performanceReport', driverId],
    queryFn: () => getPerformanceReport(driverId),
    enabled: !!driverId, // A query só executa se o driverId for válido
  });

  if (isLoading) return <div className="p-8">Carregando relatório...</div>;
  if (error)
    return <div className="p-8 text-red-500">Erro ao carregar o relatório: {error.message}</div>;
  if (!data) return <div className="p-8">Relatório não encontrado.</div>;

  const { driverInfo, reportDetails, performanceSummary } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          &larr; Voltar para a busca
        </button>
        <ReportActions
          driverInfo={driverInfo}
          reportDetails={reportDetails}
          performanceSummary={performanceSummary}
        />
        <div className="bg-white shadow rounded-lg p-6">
          <ReportHeader driverInfo={driverInfo} reportDetails={reportDetails} />
          <PerformanceTable
            periods={performanceSummary.periods}
            metrics={performanceSummary.metrics}
          />
          <PerformanceChart
            periods={performanceSummary.periods}
            metrics={performanceSummary.metrics}
          />
        </div>
      </div>
    </div>
  );
}
