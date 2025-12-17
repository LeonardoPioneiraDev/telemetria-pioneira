'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { TIME_RANGE_LABELS, TimeRange } from '@/types/metrics';
import type { SortByField } from '@/types/user-activity';
import { SORT_BY_OPTIONS } from '@/types/user-activity';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { UserActivityRankingTable } from './components/UserActivityRankingTable';
import { UserActivitySummaryCards } from './components/UserActivitySummaryCards';
import { UserDetailModal } from './components/UserDetailModal';
import { useUserActivityRanking } from './hooks/useUserActivityRanking';

export default function UserActivityPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    filters,
    setTimeRange,
    setSearch,
    setSortBy,
    toggleSortOrder,
    setPage,
  } = useUserActivityRanking({
    initialTimeRange: 'last_7d',
    initialSortBy: 'lastLogin',
    initialSortOrder: 'desc',
    initialLimit: 20,
  });

  const hasPermission =
    user?.role === 'admin' || user?.permissions?.includes('system:metrics');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  const handleSortChange = useCallback((field: SortByField) => {
    if (filters.sortBy === field) {
      toggleSortOrder();
    } else {
      setSortBy(field);
    }
  }, [filters.sortBy, setSortBy, toggleSortOrder]);

  const handleViewUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Lock className="h-5 w-5" />
              <span>Acesso Restrito</span>
            </CardTitle>
            <CardDescription className="text-red-700">
              Voce nao tem permissao para acessar o painel de atividade de usuarios.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Erro ao Carregar Dados</span>
            </CardTitle>
            <CardDescription className="text-red-700">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 text-red-700 hover:text-red-800"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar ao Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span>Atividade de Usuarios</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Monitore o engajamento e uso do sistema pelos usuarios
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filters.timeRange} onValueChange={v => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map(key => (
                <SelectItem key={key} value={key}>
                  {TIME_RANGE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <UserActivitySummaryCards data={data} />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou username..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.sortBy} onValueChange={v => setSortBy(v as SortByField)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_BY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <UserActivityRankingTable
          data={data?.users || []}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSortChange={handleSortChange}
          onViewUser={handleViewUser}
          isLoading={isLoading}
        />
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4">
          <p className="text-sm text-gray-500">
            Mostrando {((filters.page - 1) * filters.limit) + 1} a{' '}
            {Math.min(filters.page * filters.limit, data.totalUsers)} de {data.totalUsers} usuarios
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(filters.page - 1)}
              disabled={filters.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Pagina {filters.page} de {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(filters.page + 1)}
              disabled={filters.page >= data.pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        userId={selectedUserId}
        timeRange={filters.timeRange}
        onClose={handleCloseModal}
      />
    </div>
  );
}
