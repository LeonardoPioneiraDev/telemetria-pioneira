//apps/frontend/src/components/report/ReportHeader.tsx
'use client';
import { DriverInfo, ReportDetails } from '@/types/api';

// 1. Importe a função que criamos
import { formatDateToBrazil } from '@/utils/formatDate';

interface ReportHeaderProps {
  driverInfo: DriverInfo;
  reportDetails: ReportDetails;
}

export const ReportHeader = ({ driverInfo, reportDetails }: ReportHeaderProps) => (
  <header className="mb-8 pb-6 border-b border-gray-200">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">Relatório de Desempenho Individual</h1>

    {/* Informações do motorista em destaque */}
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Motorista
          </span>
          <p className="text-lg font-semibold text-gray-900">{driverInfo.name}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Crachá</span>
          <p className="text-lg font-semibold text-gray-900">{driverInfo.badge}</p>
        </div>
      </div>
    </div>

    {/* Informações do período */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div>
        <span className="font-medium text-gray-700">Data do Relatório:</span>
        {/* 2. Use a função aqui, passando a data original.
             Estou supondo que a data original está em 'reportDetails.reportDate'.
             Se o nome do campo for outro, é só ajustar.
        */}
        <span className="ml-2 text-gray-600">{formatDateToBrazil(reportDetails.reportDate)}</span>
      </div>
      <div>
        <span className="font-medium text-gray-700">Período Analisado:</span>
        <span className="ml-2 text-gray-600">{reportDetails.periodSummary}</span>
      </div>
    </div>
  </header>
);
