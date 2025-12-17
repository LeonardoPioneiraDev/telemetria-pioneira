'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SortByField, SortOrder, UserActivityRankingItem } from '@/types/user-activity';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDown, ArrowUp, Eye } from 'lucide-react';

interface UserActivityRankingTableProps {
  data: UserActivityRankingItem[];
  sortBy: SortByField;
  sortOrder: SortOrder;
  onSortChange: (field: SortByField) => void;
  onViewUser: (userId: string) => void;
  isLoading?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  moderator: 'bg-blue-100 text-blue-800',
  user: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

function formatMinutes(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${Math.round(minutes % 60)}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return 'Data invalida';
  }
}

interface SortableHeaderProps {
  field: SortByField;
  currentSort: SortByField;
  sortOrder: SortOrder;
  onClick: (field: SortByField) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

function SortableHeader({ field, currentSort, sortOrder, onClick, children, align = 'left' }: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <TableHead
      className={`cursor-pointer hover:bg-gray-50 select-none ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onClick(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {children}
        {isActive && (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        )}
      </div>
    </TableHead>
  );
}

export function UserActivityRankingTable({
  data,
  sortBy,
  sortOrder,
  onSortChange,
  onViewUser,
  isLoading,
}: UserActivityRankingTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Atividade</CardTitle>
        <CardDescription>
          Usuarios ordenados por atividade no sistema. Clique em uma coluna para ordenar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Nenhum usuario encontrado para os filtros selecionados
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Cargo</TableHead>
                <SortableHeader field="lastLogin" currentSort={sortBy} sortOrder={sortOrder} onClick={onSortChange}>
                  Ultimo Login
                </SortableHeader>
                <SortableHeader field="totalLogins" currentSort={sortBy} sortOrder={sortOrder} onClick={onSortChange} align="right">
                  Logins
                </SortableHeader>
                <SortableHeader field="totalPageViews" currentSort={sortBy} sortOrder={sortOrder} onClick={onSortChange} align="right">
                  Paginas
                </SortableHeader>
                <SortableHeader field="sessionTime" currentSort={sortBy} sortOrder={sortOrder} onClick={onSortChange} align="right">
                  Tempo
                </SortableHeader>
                <SortableHeader field="activeDays" currentSort={sortBy} sortOrder={sortOrder} onClick={onSortChange} align="right">
                  Dias Ativos
                </SortableHeader>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(user => (
                <TableRow key={user.userId} className="hover:bg-gray-50">
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
                  <TableCell>
                    <span className={user.lastLoginAt ? '' : 'text-gray-400'}>
                      {formatRelativeTime(user.lastLoginAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {user.totalLogins.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {(user.uniquePagesVisited ?? 0).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMinutes(user.totalSessionTimeMinutes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.activeDays}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewUser(user.userId)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
