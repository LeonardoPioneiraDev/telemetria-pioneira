'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyPeak } from '@/types/metrics';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

interface DailyPeaksChartProps {
  data: DailyPeak[];
}

export function DailyPeaksChart({ data }: DailyPeaksChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatValue = (value: unknown) => {
    const num = Number(value);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Picos Diarios de Requisicoes</CardTitle>
        <CardDescription>Total de requisicoes por dia</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados para o periodo selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Bar
                  dataKey="totalRequests"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                >
                  <LabelList
                    dataKey="totalRequests"
                    position="top"
                    formatter={formatValue}
                    fontSize={11}
                    fill="#6b7280"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
