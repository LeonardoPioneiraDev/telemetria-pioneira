// src/app/(private)/etl-monitoring/page.tsx

'use client';

import { EventsChart } from '@/components/etl/EventsChart';
import { JobHistoryTable } from '@/components/etl/JobHistoryTable';
import { MetricCard } from '@/components/etl/MetricCard';
import { RefreshButton } from '@/components/etl/RefreshButton';
import { StatusCard } from '@/components/etl/StatusCard';
import { TopRankingCard } from '@/components/etl/TopRankingCard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useETLHistory } from '@/hooks/etl/useETLHistory';
import { useETLMetrics } from '@/hooks/etl/useETLMetrics';
import { useETLStatus } from '@/hooks/etl/useETLStatus';
import { Activity, AlertTriangle, Clock, Database, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

export default function ETLMonitoringPage() {
  const [metricsTimeRange, setMetricsTimeRange] = useState<7 | 30>(7);

  // Hooks com polling automático
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isRefetching: statusRefetching,
  } = useETLStatus({ refetchInterval: 30000 }); // 30s

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useETLMetrics({ days: metricsTimeRange });

  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useETLHistory({ limit: 20 });

  const handleRefreshAll = () => {
    refetchStatus();
    refetchMetrics();
    refetchHistory();
  };

  const isRefreshing = statusRefetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento do ETL</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe em tempo real o status da ingestão de eventos de telemetria
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.tokenInfo.isExpiringSoon && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Token expirando em breve
            </Badge>
          )}
          <RefreshButton onRefresh={handleRefreshAll} isRefreshing={isRefreshing} />
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          status={status?.status || 'unknown'}
          lastSyncAge={status?.lastSync?.ageInMinutes}
        />

        <MetricCard
          title="Eventos Hoje"
          value={status?.today.totalEvents.toLocaleString('pt-BR') || '0'}
          description={`${status?.today.eventsPerHour || 0}/hora`}
          icon={Activity}
          isLoading={statusLoading}
        />

        <MetricCard
          title="Token Expira Em"
          value={status?.tokenInfo.expiresIn || 'N/A'}
          description={`${status?.tokenInfo.daysUntilExpiry.toFixed(1) || 0} dias restantes`}
          icon={Clock}
          isLoading={statusLoading}
        />

        <MetricCard
          title="Workers Ativos"
          value={status?.workers.eventIngestion.active || 0}
          description={`${status?.workers.eventIngestion.completed || 0} completados`}
          icon={Users}
          isLoading={statusLoading}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="7" onValueChange={v => setMetricsTimeRange(Number(v) as 7 | 30)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Métricas de Eventos</h2>
          <TabsList>
            <TabsTrigger value="7">7 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={String(metricsTimeRange)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <EventsChart data={metrics?.hourly || []} type="hourly" isLoading={metricsLoading} />
            <EventsChart data={metrics?.daily || []} type="daily" isLoading={metricsLoading} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total de Eventos"
          value={status?.performance.totalEventsAllTime.toLocaleString('pt-BR') || '0'}
          description="Desde o início"
          icon={Database}
          isLoading={statusLoading}
        />

        <MetricCard
          title="Taxa Atual"
          value={`${status?.performance.avgEventsPerMinute || 0}/min`}
          description="Média dos últimos 60 minutos"
          icon={TrendingUp}
          isLoading={statusLoading}
        />

        <MetricCard
          title="Páginas Processadas Hoje"
          value={status?.today.totalPages || 0}
          description={`~${Math.round((status?.today.totalEvents || 0) / (status?.today.totalPages || 1))} eventos/página`}
          icon={Activity}
          isLoading={statusLoading}
        />
      </div>

      {/* Top Rankings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Top 10 - Últimos 7 Dias</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TopRankingCard
            title="Tipos de Evento"
            description="Eventos mais frequentes"
            data={metrics?.topEventTypes || []}
            isLoading={metricsLoading}
          />

          <TopRankingCard
            title="Motoristas"
            description="Motoristas com mais eventos"
            data={metrics?.topDrivers || []}
            isLoading={metricsLoading}
          />

          <TopRankingCard
            title="Veículos"
            description="Veículos com mais eventos"
            data={metrics?.topVehicles || []}
            isLoading={metricsLoading}
          />
        </div>
      </div>

      {/* Job History */}
      <JobHistoryTable data={history || []} isLoading={historyLoading} />
    </div>
  );
}
