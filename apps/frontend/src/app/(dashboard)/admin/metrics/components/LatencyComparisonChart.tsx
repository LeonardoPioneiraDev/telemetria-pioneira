'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestsOverTimeData, TimeRange } from '@/types/metrics';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface LatencyComparisonChartProps {
  data: RequestsOverTimeData[];
  timeRange: TimeRange;
}

export function LatencyComparisonChart({ data, timeRange }: LatencyComparisonChartProps) {
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
        <CardTitle>Latencia: Media vs P95</CardTitle>
        <CardDescription>Comparacao de latencia ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados para o periodo selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTimestamp}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} unit="ms" />
                <Tooltip
                  labelFormatter={formatTimestamp}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)} ms`,
                    name === 'avgLatencyMs' ? 'Media' : 'P95',
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend
                  formatter={value => (value === 'avgLatencyMs' ? 'Latencia Media' : 'Latencia P95')}
                />
                <Line
                  type="monotone"
                  dataKey="avgLatencyMs"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95LatencyMs"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
