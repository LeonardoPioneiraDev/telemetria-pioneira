'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { TimeRange } from '@/types/metrics';
import { AlertCircle, ArrowLeft, BarChart3, Lock, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DailyPeaksChart } from './components/DailyPeaksChart';
import { LatencyComparisonChart } from './components/LatencyComparisonChart';
import { MetricsSummaryCards } from './components/MetricsSummaryCards';
import { PlatformStatsCharts } from './components/PlatformStatsCharts';
import { RequestsOverTimeChart } from './components/RequestsOverTimeChart';
import { SlowestEndpointsTable } from './components/SlowestEndpointsTable';
import { StatusCodeDetailsTable } from './components/StatusCodeDetailsTable';
import { StatusCodePieChart } from './components/StatusCodePieChart';
import { TimeRangeSelector } from './components/TimeRangeSelector';
import { TopUsersTable } from './components/TopUsersTable';
import { useMetrics } from './hooks/useMetrics';

export default function MetricsDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('last_24h');

  const { data, isLoading, error, refetch } = useMetrics(timeRange);

  const hasPermission =
    user?.role === 'admin' || user?.permissions?.includes('system:metrics');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Lock className="h-5 w-5" />
              <span>Acesso Restrito</span>
            </CardTitle>
            <CardDescription className="text-red-700">
              Voce nao tem permissao para acessar o painel de metricas.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Erro ao Carregar Metricas</span>
            </CardTitle>
            <CardDescription className="text-red-700">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 text-red-700 hover:text-red-800"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar ao Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span>Metricas do Sistema</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Monitore requisicoes, latencia e atividade de usuarios
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <MetricsSummaryCards data={data?.summary} />
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[380px]" />
            <Skeleton className="h-[380px]" />
          </>
        ) : (
          <>
            <RequestsOverTimeChart
              data={data?.charts.requestsOverTime || []}
              timeRange={timeRange}
            />
            <LatencyComparisonChart
              data={data?.charts.requestsOverTime || []}
              timeRange={timeRange}
            />
          </>
        )}
      </div>

      {/* Charts Row 2 - Status Codes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[350px]" />
            <Skeleton className="h-[350px]" />
          </>
        ) : (
          <>
            <StatusCodePieChart data={data?.charts.statusDistribution || []} />
            <StatusCodeDetailsTable data={data?.charts.statusCodeDetails || []} />
          </>
        )}
      </div>

      {/* Charts Row 3 - Daily Peaks */}
      <div>
        {isLoading ? (
          <Skeleton className="h-[350px]" />
        ) : (
          <DailyPeaksChart data={data?.charts.dailyPeaks || []} />
        )}
      </div>

      {/* Charts Row 4 - Platform Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[350px]" />
          ))}
        </div>
      ) : (
        <>
          {console.log('Metrics page - platform data:', data?.platform)}
          <PlatformStatsCharts
            devices={data?.platform?.devices || []}
            operatingSystems={data?.platform?.operatingSystems || []}
            browsers={data?.platform?.browsers || []}
          />
        </>
      )}

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </>
        ) : (
          <>
            <TopUsersTable data={data?.rankings.topUsers || []} />
            <SlowestEndpointsTable data={data?.rankings.slowestEndpoints || []} />
          </>
        )}
      </div>
    </div>
  );
}
