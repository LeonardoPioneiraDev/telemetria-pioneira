'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusCodeDistribution } from '@/types/metrics';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface StatusCodePieChartProps {
  data: StatusCodeDistribution[];
}

const STATUS_COLORS: Record<string, string> = {
  '2xx Success': '#22c55e',
  '3xx Redirect': '#3b82f6',
  '4xx Client Error': '#f59e0b',
  '5xx Server Error': '#ef4444',
  Other: '#6b7280',
};

export function StatusCodePieChart({ data }: StatusCodePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuicao de Status Codes</CardTitle>
        <CardDescription>Total: {total.toLocaleString('pt-BR')} requisicoes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados para o periodo selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="statusGroup"
                  label={({ statusGroup, percent }) =>
                    `${statusGroup.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.statusGroup] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('pt-BR'),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
