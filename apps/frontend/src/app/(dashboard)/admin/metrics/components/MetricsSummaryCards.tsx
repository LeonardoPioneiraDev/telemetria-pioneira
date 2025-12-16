'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsSummary } from '@/types/metrics';
import { Activity, AlertTriangle, Clock, LogIn, Users } from 'lucide-react';

interface MetricsSummaryCardsProps {
  data?: MetricsSummary;
}

export function MetricsSummaryCards({ data }: MetricsSummaryCardsProps) {
  const cards = [
    {
      title: 'Total de Requisicoes',
      value: data?.totalRequests?.toLocaleString('pt-BR') || '0',
      icon: Activity,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
    },
    {
      title: 'Latencia Media',
      value: `${data?.avgLatencyMs?.toFixed(1) || '0'} ms`,
      icon: Clock,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100',
    },
    {
      title: 'Latencia P95',
      value: `${data?.p95LatencyMs || '0'} ms`,
      icon: Clock,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100',
    },
    {
      title: 'Taxa de Erro',
      value: `${data?.errorRate?.toFixed(2) || '0'}%`,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-red-100',
    },
    {
      title: 'Logins Unicos',
      value: data?.uniqueLoggedInUsers?.toLocaleString('pt-BR') || '0',
      icon: LogIn,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(card => (
        <Card key={card.title} className={`bg-gradient-to-r ${card.bgGradient} border-0`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${card.gradient}`}>
              <card.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
