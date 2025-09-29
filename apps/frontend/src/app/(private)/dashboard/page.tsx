// apps/telemetria-web/src/app/(private)/dashboard/page.tsx
'use client';

import { DriverDetails } from '@/components/dashboard/DriverDetails';
import { DriverSearch } from '@/components/dashboard/DriverSearch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { Driver } from '@/types/api';
import { BarChart3, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function DashboardPage() {
  const { logout } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [reportDate, setReportDate] = useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Dashboard de Telemetria</h1>
            </div>
            <Button variant="ghost" onClick={logout} className="text-gray-700 hover:text-gray-900">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Search Section */}
          <Card className=" shadow rounded-lg p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Parâmetros do Relatório</h2>
              <p className="text-sm text-gray-600">
                Selecione o motorista e a data de referência para gerar o relatório de desempenho.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">Motorista</p>
                <DriverSearch onDriverSelect={setSelectedDriver} selectedDriver={selectedDriver} />
              </div>
              <div className="flex-shrink-0">
                <p className="text-sm font-medium text-gray-700 mb-1">Data de Referência</p>
                <DatePicker date={reportDate} setDate={setReportDate} />
              </div>
            </div>
          </Card>

          {selectedDriver && <DriverDetails driver={selectedDriver} reportDate={reportDate} />}

          {!selectedDriver && (
            <Card className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um motorista</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Use o campo de busca acima para encontrar um motorista e visualizar seu relatório
                  de desempenho detalhado com métricas de telemetria.
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
