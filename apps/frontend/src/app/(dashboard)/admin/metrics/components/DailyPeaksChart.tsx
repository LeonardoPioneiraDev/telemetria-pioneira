'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyPeak } from '@/types/metrics';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Picos Diarios de Requisicoes</CardTitle>
        <CardDescription>Total de requisicoes e horario de pico por dia</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados para o periodo selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: number, name: string) => {
                    if (name === 'totalRequests') {
                      return [value.toLocaleString('pt-BR'), 'Total'];
                    }
                    return [value.toLocaleString('pt-BR'), 'Pico'];
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as DailyPeak;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-medium">{formatDate(label)}</p>
                          <p className="text-sm text-gray-600">
                            Total: {item.totalRequests.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Pico: {formatHour(item.peakHour)} ({item.peakHourRequests.toLocaleString('pt-BR')} req)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalRequests" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
