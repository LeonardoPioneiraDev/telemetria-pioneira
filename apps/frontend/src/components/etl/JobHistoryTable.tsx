// src/components/etl/JobHistoryTable.tsx

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { JobHistory } from '@/types/etl';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle } from 'lucide-react';

interface JobHistoryTableProps {
  data: JobHistory[];
  isLoading?: boolean;
}

export function JobHistoryTable({ data, isLoading }: JobHistoryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Execuções</CardTitle>
        <CardDescription>Últimas {data.length} execuções do worker</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma execução encontrada
                </TableCell>
              </TableRow>
            ) : (
              data.map((job, index) => (
                <TableRow key={job.id || index}>
                  <TableCell>
                    {job.status === 'completed' ? (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        Sucesso
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <XCircle className="h-3 w-3" />
                        Falhou
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.id || 'N/A'}</TableCell>
                  <TableCell className="text-xs">
                    {job.processedOn
                      ? format(new Date(job.processedOn), 'dd/MM HH:mm:ss', { locale: ptBR })
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {job.finishedOn
                      ? format(new Date(job.finishedOn), 'dd/MM HH:mm:ss', { locale: ptBR })
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs">{formatDuration(job.duration)}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {job.status === 'failed' ? job.failedReason : 'OK'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
