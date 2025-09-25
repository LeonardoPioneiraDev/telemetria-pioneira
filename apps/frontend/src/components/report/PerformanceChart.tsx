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

// Cores modernas que combinam com shadcn/ui
const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];

const formatXAxisLabel = (label: string) => {
  if (label.includes('a')) {
    return label.replace(/(\d{2})\.(\d{2})\.\d{4}\s+a\s+(\d{2})\.(\d{2})\.\d{4}/, '$1/$2-$3/$4');
  }
  return label.replace(/(\d{2})\.(\d{2})\.\d{4}/, '$1/$2');
};

// Custom tooltip para combinar com o tema shadcn/ui
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.dataKey}:</span> {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const PerformanceChart = ({ periods, metrics }: PerformanceChartProps) => {
  // FILTRAR PERÍODOS QUE TÊM PELO MENOS UMA OCORRÊNCIA
  const periodsWithData = periods.filter(period => {
    const totalForPeriod = metrics.reduce((sum, metric) => {
      return sum + (metric.counts[period.id] ?? 0);
    }, 0);
    return totalForPeriod > 0;
  });

  // FILTRAR MÉTRICAS QUE TÊM PELO MENOS UMA OCORRÊNCIA
  const metricsWithData = metrics.filter(metric => {
    const totalForMetric = Object.values(metric.counts).reduce((sum, count) => {
      return sum + (count ?? 0);
    }, 0);
    return totalForMetric > 0;
  });

  // Se não há dados, mostrar mensagem
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

  // ORDENAR PERÍODOS CRONOLOGICAMENTE (se possível)
  const sortedPeriodsWithData = [...periodsWithData].sort((a, b) => {
    // Tentar extrair datas para ordenação
    const extractDate = (label: string) => {
      const match = label.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      return new Date(0); // fallback
    };

    return extractDate(a.label).getTime() - extractDate(b.label).getTime();
  });

  const chartData = sortedPeriodsWithData.map(period => {
    const dataPoint: { name: string; [key: string]: string | number } = {
      name: formatXAxisLabel(period.label),
    };

    metricsWithData.forEach(metric => {
      const value = metric.counts[period.id] ?? 0;
      dataPoint[metric.eventType] = value;
    });

    return dataPoint;
  });

  console.log('🔍 Chart Data:', chartData);
  console.log(
    '🔍 Periods with data:',
    sortedPeriodsWithData.map(p => `${p.id}: ${p.label}`)
  );
  console.log(
    '🔍 Metrics with data:',
    metricsWithData.map(m => m.eventType)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Gráfico de Ocorrências</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualização das métricas ao longo dos períodos analisados
        </p>
        <div className="text-xs text-muted-foreground mt-2">
          Exibindo {metricsWithData.length} métricas • {sortedPeriodsWithData.length} períodos
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--muted-foreground))"
                opacity={0.3}
              />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                allowDecimals={false}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              {metricsWithData.map((metric, index) => (
                <Bar
                  key={metric.eventType}
                  dataKey={metric.eventType}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                  minPointSize={2}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
