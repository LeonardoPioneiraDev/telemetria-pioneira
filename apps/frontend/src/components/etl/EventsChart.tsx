// src/components/etl/EventsChart.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyMetric, HourlyMetric } from '@/types/etl';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface EventsChartProps {
  data: HourlyMetric[] | DailyMetric[];
  type: 'hourly' | 'daily';
  isLoading?: boolean;
}

export function EventsChart({ data, type, isLoading }: EventsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  const formattedData = data.map(item => {
    let dateStr: string;

    if (type === 'hourly') {
      dateStr = (item as HourlyMetric).hour;
    } else {
      dateStr = (item as DailyMetric).date;
    }

    let label: string;
    if (type === 'hourly') {
      label = format(parseISO(dateStr), 'HH:mm', { locale: ptBR });
    } else {
      label = format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
    }

    return {
      ...item,
      label,
    };
  });

  const ChartComponent = type === 'hourly' ? LineChart : BarChart;
  const DataComponent = type === 'hourly' ? Line : Bar;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === 'hourly' ? 'Eventos por Hora' : 'Eventos por Dia'}</CardTitle>
        <CardDescription>
          {type === 'hourly' ? 'Últimas 24 horas' : `Últimos ${data.length} dias`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <DataComponent
              type={type === 'hourly' ? 'monotone' : undefined}
              dataKey="events"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary))"
              name="Eventos"
            />
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
