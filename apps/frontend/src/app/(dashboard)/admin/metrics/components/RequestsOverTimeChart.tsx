'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestsOverTimeData, TIME_RANGE_LABELS, TimeRange } from '@/types/metrics';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RequestsOverTimeChartProps {
  data: RequestsOverTimeData[];
  timeRange: TimeRange;
}

export function RequestsOverTimeChart({ data, timeRange }: RequestsOverTimeChartProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (['last_hour', 'last_3h', 'last_6h', 'last_24h'].includes(timeRange)) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requisicoes ao Longo do Tempo</CardTitle>
        <CardDescription>{TIME_RANGE_LABELS[timeRange]}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados para o periodo selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTimestamp}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  labelFormatter={formatTimestamp}
                  formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Requisicoes']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requestCount"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRequests)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
