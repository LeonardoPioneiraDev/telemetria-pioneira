// src/components/etl/StatusCard.tsx

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ETLStatusType } from '@/types/etl';
import { Activity, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusCardProps {
  status: ETLStatusType;
  lastSyncAge?: number | null;
}

const statusConfig = {
  running: {
    icon: Activity,
    label: 'Em Execução',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    badgeVariant: 'default' as const,
  },
  idle: {
    icon: CheckCircle,
    label: 'Ocioso',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    badgeVariant: 'secondary' as const,
  },
  error: {
    icon: XCircle,
    label: 'Erro',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    badgeVariant: 'destructive' as const,
  },
  circuit_breaker_open: {
    icon: AlertCircle,
    label: 'Circuit Breaker Aberto',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    badgeVariant: 'destructive' as const,
  },
  unknown: {
    icon: Clock,
    label: 'Desconhecido',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    badgeVariant: 'outline' as const,
  },
};

export function StatusCard({ status, lastSyncAge }: StatusCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Status do ETL</CardTitle>
        <div className={`p-2 rounded-full ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
          {lastSyncAge !== null && lastSyncAge !== undefined && (
            <p className="text-xs text-muted-foreground">
              Última sync:{' '}
              {lastSyncAge < 60 ? `${lastSyncAge}min` : `${Math.floor(lastSyncAge / 60)}h`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
