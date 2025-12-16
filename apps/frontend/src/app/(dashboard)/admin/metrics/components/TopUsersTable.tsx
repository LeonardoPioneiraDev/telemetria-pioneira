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
import { TopUser } from '@/types/metrics';
import { Crown, Medal, Trophy } from 'lucide-react';

interface TopUsersTableProps {
  data: TopUser[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  moderator: 'bg-blue-100 text-blue-800',
  user: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const RANK_ICONS = [
  { icon: Trophy, color: 'text-yellow-500' },
  { icon: Medal, color: 'text-gray-400' },
  { icon: Crown, color: 'text-amber-600' },
];

export function TopUsersTable({ data }: TopUsersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Usuarios Mais Ativos</CardTitle>
        <CardDescription>Usuarios com mais requisicoes no periodo</CardDescription>
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
                <TableHead className="w-12">#</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Requisicoes</TableHead>
                <TableHead className="text-right">Dias Ativos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((user, index) => {
                const RankIcon = RANK_ICONS[index]?.icon;
                const rankColor = RANK_ICONS[index]?.color;

                return (
                  <TableRow key={user.userId}>
                    <TableCell>
                      {RankIcon ? (
                        <RankIcon className={`h-5 w-5 ${rankColor}`} />
                      ) : (
                        <span className="text-gray-500">{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={ROLE_COLORS[user.role] || 'bg-gray-100'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {user.requestCount.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">{user.activeDays}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
