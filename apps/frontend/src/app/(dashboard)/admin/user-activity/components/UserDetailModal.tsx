'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TimeRange } from '@/types/metrics';
import type { UserActivityDetailResponse, UserActivityOverTime } from '@/types/user-activity';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Calendar, Clock, LogIn, Monitor } from 'lucide-react';
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
import { useUserActivityDetail } from '../hooks/useUserActivityDetail';

interface UserDetailModalProps {
  userId: string | null;
  timeRange: TimeRange;
  onClose: () => void;
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return 'Data invalida';
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return 'Data invalida';
  }
}

function formatIpAddress(ip: string | null): string {
  if (!ip) return '-';
  // Remove CIDR notation (e.g., /32) from IP address
  return ip.replace(/\/\d+$/, '');
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="bg-gray-50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityChartProps {
  data: UserActivityOverTime[];
}

function ActivityChart({ data }: ActivityChartProps) {
  const chartData = data.map(item => ({
    ...item,
    date: item.date.slice(5), // MM-DD format
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="logins" name="Logins" fill="#3b82f6" />
        <Bar dataKey="pageViews" name="Paginas" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function UserDetailContent({ data }: { data: UserActivityDetailResponse }) {
  const { user, activity, topPages, recentLogins, activityOverTime } = data;

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">{user.fullName}</h3>
          <p className="text-gray-500">@{user.username}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
        <div className="text-right">
          <Badge className={ROLE_COLORS[user.role] || 'bg-gray-100'}>
            {user.role}
          </Badge>
          <p className="text-xs text-gray-400 mt-2">
            Cadastrado em {formatDate(user.createdAt)}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total de Logins"
          value={activity.totalLogins.toLocaleString('pt-BR')}
          icon={LogIn}
        />
        <StatCard
          title="Paginas Visitadas"
          value={(activity.uniquePagesVisited ?? 0).toLocaleString('pt-BR')}
          icon={Monitor}
        />
        <StatCard
          title="Tempo Total"
          value={formatMinutes(activity.totalSessionTimeMinutes)}
          icon={Clock}
        />
        <StatCard
          title="Dias Ativos"
          value={activity.activeDays}
          icon={Calendar}
        />
      </div>

      {/* Last Activity Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Ultimo Login</p>
            <p className="font-medium">{formatRelativeTime(activity.lastLoginAt)}</p>
            {activity.lastLoginIp && (
              <p className="text-xs text-gray-400">IP: {formatIpAddress(activity.lastLoginIp)}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500">Ultima Atividade</p>
            <p className="font-medium">{formatRelativeTime(activity.lastActivityAt)}</p>
          </div>
        </div>
      </div>

      {/* Tabs with detailed info */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="pages">Paginas</TabsTrigger>
          <TabsTrigger value="logins">Logins</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Atividade ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              {activityOverTime.length > 0 ? (
                <ActivityChart data={activityOverTime} />
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  Sem dados de atividade no periodo
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Paginas Mais Visitadas</CardTitle>
            </CardHeader>
            <CardContent>
              {topPages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pagina</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">Tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPages.map((page, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                          <p className="text-xs text-gray-400">{page.pagePath}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          {page.viewCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMinutes(page.totalTimeMinutes)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  Nenhuma pagina visitada no periodo
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historico de Logins</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogins.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Duracao</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogins.map((login, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <p className="font-medium">{formatDate(login.loginAt)}</p>
                          {login.logoutAt && (
                            <p className="text-xs text-gray-400">
                              Logout: {formatDate(login.logoutAt)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {login.sessionDurationMinutes
                            ? formatMinutes(login.sessionDurationMinutes)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatIpAddress(login.ipAddress)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  Nenhum login no periodo
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function UserDetailModal({ userId, timeRange, onClose }: UserDetailModalProps) {
  const { data, isLoading, isError } = useUserActivityDetail(userId, timeRange);

  return (
    <Dialog open={userId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] min-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Detalhes de Atividade
          </DialogTitle>
          <DialogDescription>
            Analise detalhada da atividade do usuario no sistema
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-64 text-red-500">
            Erro ao carregar dados do usuario
          </div>
        )}

        {data && <UserDetailContent data={data} />}
      </DialogContent>
    </Dialog>
  );
}
