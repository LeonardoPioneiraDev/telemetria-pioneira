'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SlowestEndpoint } from '@/types/metrics';

interface SlowestEndpointsTableProps {
  data: SlowestEndpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-amber-100 text-amber-800',
  PATCH: 'bg-purple-100 text-purple-800',
  DELETE: 'bg-red-100 text-red-800',
};

function getLatencyColor(latency: number): string {
  if (latency < 100) return 'text-green-600';
  if (latency < 500) return 'text-amber-600';
  return 'text-red-600';
}

export function SlowestEndpointsTable({ data }: SlowestEndpointsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoints Mais Lentos</CardTitle>
        <CardDescription>Endpoints ordenados por latencia media</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Sem dados para o periodo selecionado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Avg (ms)</TableHead>
                <TableHead className="text-right">P95 (ms)</TableHead>
                <TableHead className="text-right">Max (ms)</TableHead>
                <TableHead className="text-right">Reqs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((endpoint, index) => (
                <TableRow key={`${endpoint.method}-${endpoint.endpoint}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${METHOD_COLORS[endpoint.method] || 'bg-gray-100'} font-mono text-xs`}
                      >
                        {endpoint.method}
                      </Badge>
                      <span className="font-mono text-sm truncate max-w-[200px]" title={endpoint.endpoint}>
                        {endpoint.endpoint}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getLatencyColor(endpoint.avgLatencyMs)}`}>
                    {endpoint.avgLatencyMs.toFixed(1)}
                  </TableCell>
                  <TableCell className={`text-right ${getLatencyColor(endpoint.p95LatencyMs)}`}>
                    {endpoint.p95LatencyMs}
                  </TableCell>
                  <TableCell className={`text-right ${getLatencyColor(endpoint.maxLatencyMs)}`}>
                    {endpoint.maxLatencyMs}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {endpoint.requestCount.toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
