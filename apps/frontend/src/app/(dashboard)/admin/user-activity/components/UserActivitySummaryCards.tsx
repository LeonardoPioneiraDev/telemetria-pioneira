'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserActivityRankingResponse } from '@/types/user-activity';
import { Activity, TrendingUp, UserCheck, UserX } from 'lucide-react';

interface UserActivitySummaryCardsProps {
  data?: UserActivityRankingResponse;
}

export function UserActivitySummaryCards({ data }: UserActivitySummaryCardsProps) {
  const totalUsers = data?.totalUsers || 0;
  const activeUsers = data?.activeUsersCount || 0;
  const inactiveUsers = data?.inactiveUsersCount || 0;
  const engagementRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0';

  const cards = [
    {
      title: 'Total de Usuarios',
      value: totalUsers.toLocaleString('pt-BR'),
      icon: Activity,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
    },
    {
      title: 'Usuarios Ativos',
      value: activeUsers.toLocaleString('pt-BR'),
      subtitle: totalUsers > 0 ? `${((activeUsers / totalUsers) * 100).toFixed(0)}% do total` : '',
      icon: UserCheck,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100',
    },
    {
      title: 'Usuarios Inativos',
      value: inactiveUsers.toLocaleString('pt-BR'),
      subtitle: totalUsers > 0 ? `${((inactiveUsers / totalUsers) * 100).toFixed(0)}% do total` : '',
      icon: UserX,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100',
    },
    {
      title: 'Taxa de Engajamento',
      value: `${engagementRate}%`,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.title} className={`bg-gradient-to-r ${card.bgGradient} border-0`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${card.gradient}`}>
              <card.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
