'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusCodeDetail } from '@/types/metrics';

interface StatusCodeDetailsTableProps {
  data: StatusCodeDetail[];
}

const STATUS_GROUP_COLORS: Record<string, string> = {
  '2xx Success': 'bg-green-100 text-green-800',
  '3xx Redirect': 'bg-blue-100 text-blue-800',
  '4xx Client Error': 'bg-amber-100 text-amber-800',
  '5xx Server Error': 'bg-red-100 text-red-800',
  Other: 'bg-gray-100 text-gray-800',
};

export function StatusCodeDetailsTable({ data }: StatusCodeDetailsTableProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento de Status Codes</CardTitle>
        <CardDescription>
          {total.toLocaleString('pt-BR')} requisicoes no periodo
        </CardDescription>
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
                <TableHead className="w-24">Codigo</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-32">Categoria</TableHead>
                <TableHead className="w-28 text-right">Quantidade</TableHead>
                <TableHead className="w-24 text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(item => (
                <TableRow key={item.statusCode}>
                  <TableCell className="font-mono font-semibold">
                    {item.statusCode}
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_GROUP_COLORS[item.statusGroup] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.statusGroup.split(' ')[0]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.count.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.percentage.toFixed(1)}%
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
