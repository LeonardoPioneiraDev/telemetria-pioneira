//apps/frontend/src/components/report/PerformanceChart.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceMetric, PerformancePeriod } from '@/types/api';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PerformanceChartProps {
  periods: PerformancePeriod[];
  metrics: PerformanceMetric[];
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

const formatXAxisLabel = (label: string) => {
  if (label.includes('a')) {
    return label.replace(/(\d{2})\.(\d{2})\.\d{4}\s+a\s+(\d{2})\.(\d{2})\.\d{4}/, '$1/$2-$3/$4');
  }
  return label.replace(/(\d{2})\.(\d{2})\.\d{4}/, '$1/$2');
};

const CustomTooltipInverted = ({ active, payload, label, periodColors }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: periodColors[entry.name] }}
          />
          <p className="text-sm">
            <span className="font-medium">{formatXAxisLabel(entry.name)}:</span>
            {' ' + entry.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export const PerformanceChart = ({ periods, metrics }: PerformanceChartProps) => {
  const periodsWithData = periods.filter(period => {
    const totalForPeriod = metrics.reduce((sum, metric) => {
      return sum + (metric.counts[period.id] ?? 0);
    }, 0);
    return totalForPeriod > 0;
  });

  const metricsWithData = metrics.filter(metric => {
    const totalForMetric = Object.values(metric.counts).reduce((sum, count) => {
      return sum + (count ?? 0);
    }, 0);
    return totalForMetric > 0;
  });

  if (periodsWithData.length === 0 || metricsWithData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Gráfico de Ocorrências</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualização das métricas ao longo dos períodos analisados
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[450px] w-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">Nenhuma ocorrência para exibir</p>
              <p className="text-sm">Não há dados suficientes para gerar o gráfico.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedPeriodsWithData = [...periodsWithData].sort((a, b) => {
    const extractDate = (label: string) => {
      const match = label.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      return new Date(0);
    };

    return extractDate(a.label).getTime() - extractDate(b.label).getTime();
  });

  const chartData = metricsWithData.map(metric => {
    const dataPoint: { name: string; [key: string]: number } = {
      name: metric.eventType.replace('(Tr) ', ''),
    };

    sortedPeriodsWithData.forEach(period => {
      dataPoint[period.label] = metric.counts[period.id] || 0;
    });

    return dataPoint;
  });

  const periodColors = sortedPeriodsWithData.reduce(
    (acc, period, index) => ({
      ...acc,
      [period.label]: COLORS[index % COLORS.length],
    }),
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Gráfico de eventos</CardTitle>
        <p className="text-sm text-muted-foreground">Eventos por métrica ao longo dos períodos</p>
      </CardHeader>
      <CardContent>
        <div className="h-[650px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 80, right: 30, top: 20, bottom: 80 }}
              barCategoryGap={10}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
              <XAxis type="number" allowDecimals={false} />
              <Tooltip content={<CustomTooltipInverted periodColors={periodColors} />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={value => formatXAxisLabel(value)}
              />
              {sortedPeriodsWithData.map(period => (
                <Bar
                  key={period.label}
                  dataKey={period.label}
                  fill={periodColors[period.label]}
                  radius={[0, 4, 4, 0]}
                  label={{
                    position: 'right',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fill: 'black',
                    formatter: (value: number) => (value > 0 ? value : ''),
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
