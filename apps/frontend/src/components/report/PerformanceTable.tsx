//apps/frontend/src/components/report/PerformanceTable.tsx
'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PerformanceMetric, PerformancePeriod } from '@/types/api';

interface PerformanceTableProps {
  periods: PerformancePeriod[];
  metrics: PerformanceMetric[];
}

// Função para encurtar os rótulos das datas
const formatTableHeader = (label: string) => {
  if (label.includes('a')) {
    return label.replace(/(\d{2})\.(\d{2})\.\d{4}\s+a\s+(\d{2})\.(\d{2})\.\d{4}/, '$1/$2 - $3/$4');
  }
  return label.replace(/(\d{2})\.(\d{2})\.\d{4}/, '$1/$2');
};

// Função para determinar a cor do badge baseado na quantidade
const getBadgeVariant = (count: number) => {
  if (count === 0) return 'secondary';
  if (count <= 2) return 'default';
  if (count <= 5) return 'destructive';
  return 'destructive';
};

export const PerformanceTable = ({ periods, metrics }: PerformanceTableProps) => {
  // DEBUG: Vamos ver os dados que estão chegando
  console.log('🔍 DEBUG - Periods:', periods);
  console.log('🔍 DEBUG - Metrics:', metrics);

  // FILTRAR PERÍODOS QUE TÊM PELO MENOS UMA OCORRÊNCIA
  const periodsWithData = periods.filter(period => {
    const hasData = metrics.some(metric => {
      const count = metric.counts[period.id];
      const hasOccurrence = count !== undefined && count !== null && count > 0;
      console.log(
        `🔍 Period ${period.id} (${period.label}) - Count: ${count}, HasOccurrence: ${hasOccurrence}`
      );
      return hasOccurrence;
    });
    console.log(`🔍 Period ${period.id} final result: ${hasData}`);
    return hasData;
  });

  // FILTRAR MÉTRICAS QUE TÊM PELO MENOS UMA OCORRÊNCIA
  const metricsWithData = metrics.filter(metric => {
    const hasData = Object.entries(metric.counts).some(([periodId, count]) => {
      const hasOccurrence = count !== undefined && count !== null && count > 0;
      console.log(
        `🔍 Metric "${metric.eventType}" - Period ${periodId}: ${count}, HasOccurrence: ${hasOccurrence}`
      );
      return hasOccurrence;
    });
    console.log(`🔍 Metric "${metric.eventType}" final result: ${hasData}`);
    return hasData;
  });

  console.log('🔍 DEBUG - Periods with data:', periodsWithData);
  console.log('🔍 DEBUG - Metrics with data:', metricsWithData);

  // Calcular total de eventos por métrica (apenas métricas com dados)
  const metricsWithTotals = metricsWithData.map(metric => {
    const total = periods.reduce((sum, period) => {
      const count = metric.counts[period.id] ?? 0;
      return sum + count;
    }, 0);
    console.log(`🔍 Metric "${metric.eventType}" total: ${total}`);
    return { ...metric, total };
  });

  // Se não há dados, mostrar mensagem
  if (periodsWithData.length === 0 || metricsWithData.length === 0) {
    console.log('🔍 No data found, showing empty state');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Métricas de Desempenho</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detalhamento das ocorrências por período analisado
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium mb-2">Nenhuma ocorrência encontrada</p>
              <p className="text-sm">Não há dados de telemetria para o período analisado.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Métricas de Desempenho</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detalhamento das ocorrências por período analisado
        </p>
        <div className="text-xs text-muted-foreground mt-2">
          Exibindo {metricsWithData.length} de {metrics.length} métricas • {periodsWithData.length}{' '}
          de {periods.length} períodos
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px] font-semibold">Tipo de Ocorrência</TableHead>
                {periodsWithData.map(period => (
                  <TableHead key={period.id} className="text-center font-semibold min-w-[100px]">
                    {formatTableHeader(period.label)}
                  </TableHead>
                ))}
                <TableHead className="text-center font-semibold min-w-[80px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricsWithTotals.map(metric => (
                <TableRow key={metric.eventType}>
                  <TableCell className="font-medium">
                    <div className="max-w-[280px] break-words">{metric.eventType}</div>
                  </TableCell>
                  {periodsWithData.map(period => (
                    <TableCell key={period.id} className="text-center">
                      <Badge variant={getBadgeVariant(metric.counts[period.id] ?? 0)}>
                        {metric.counts[period.id] ?? 0}
                      </Badge>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Badge variant={getBadgeVariant(metric.total)} className="font-bold">
                      {metric.total}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
