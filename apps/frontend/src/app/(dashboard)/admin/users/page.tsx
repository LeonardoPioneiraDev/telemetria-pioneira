// src/app/(dashboard)/admin/users/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, AlertCircle, Lock, RefreshCw, Shield, UserCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UserDialog } from './components/UserDialog';
import { UserFilters } from './components/UserFilters';
import { UserTable } from './components/UserTable';
import { useUsers } from './hooks/useUsers';

export default function UsersManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
  } = useUsers();

  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
  });

  // 🔧 VERIFICAÇÃO DE PERMISSÃO MELHORADA
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Verificar se tem permissão administrativa
    const hasAdminPermissions =
      user?.role === 'admin' ||
      user?.permissions?.includes('user:list') ||
      user?.permissions?.includes('USER_LIST');

    if (!hasAdminPermissions) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Se não estiver autenticado ou não tiver permissão
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-600">
              <Lock className="h-5 w-5" />
              <span>Autenticação Necessária</span>
            </CardTitle>
            <CardDescription className="text-amber-700">
              Você precisa estar logado para acessar esta área.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasAdminPermissions =
    user?.role === 'admin' ||
    user?.permissions?.includes('user:list') ||
    user?.permissions?.includes('USER_LIST');

  if (!hasAdminPermissions) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <Lock className="h-5 w-5" />
              <span>Acesso Restrito</span>
            </CardTitle>
            <CardDescription className="text-red-700">
              Esta área é restrita a administradores do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Informações do usuário:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>
                    <strong>Email:</strong> {user?.email}
                  </li>
                  <li>
                    <strong>Role:</strong> {user?.role}
                  </li>
                  <li>
                    <strong>Permissões:</strong> {user?.permissions?.join(', ') || 'Nenhuma'}
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtrar usuários baseado nos filtros aplicados
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.username.toLowerCase().includes(filters.search.toLowerCase());

      const matchesRole = filters.role === 'all' || user.role === filters.role;

      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active' && user.status === 'active') ||
        (filters.status === 'inactive' && user.status !== 'active');

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, filters]);

  // Estatísticas dos usuários
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const regularUsers = users.filter(u => u.role === 'user').length;

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminUsers,
      regular: regularUsers,
    };
  }, [users]);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Erro ao Carregar Usuários</span>
            </CardTitle>
            <CardDescription className="text-red-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={fetchUsers}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span>Gerenciar Usuários</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie usuários, permissões e configurações do sistema
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <UserDialog onSave={createUser} />
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
            <p className="text-xs text-blue-600 mt-1">
              {stats.active} ativos, {stats.inactive} inativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Usuários Ativos</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.active}</div>
            <p className="text-xs text-green-600 mt-1">
              {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.admins}</div>
            <p className="text-xs text-red-600 mt-1">Permissões administrativas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Usuários Regulares
            </CardTitle>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.regular}</div>
            <p className="text-xs text-purple-600 mt-1">Permissões padrão</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <UserFilters
        onFilterChange={setFilters}
        totalUsers={users.length}
        filteredUsers={filteredUsers.length}
      />

      {/* Tabela de Usuários */}
      <UserTable
        users={filteredUsers}
        loading={loading}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onResetPassword={resetUserPassword}
      />
    </div>
  );
}
