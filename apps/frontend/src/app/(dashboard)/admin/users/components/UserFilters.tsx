// src/app/(dashboard)/admin/users/components/UserFilters.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Search, Shield, UserCheck, Users, X } from 'lucide-react';
import { useState } from 'react';

interface UserFiltersProps {
  onFilterChange: (filters: { search: string; role: string; status: string }) => void;
  totalUsers: number;
  filteredUsers: number;
}

export function UserFilters({ onFilterChange, totalUsers, filteredUsers }: UserFiltersProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value, role, status });
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
    onFilterChange({ search, role: value, status });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFilterChange({ search, role, status: value });
  };

  const clearFilters = () => {
    setSearch('');
    setRole('all');
    setStatus('all');
    onFilterChange({ search: '', role: 'all', status: 'all' });
  };

  const hasActiveFilters = search || role !== 'all' || status !== 'all';

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
      {/* Header dos Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Controles de Filtro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtro por Role */}
        <Select value={role} onValueChange={handleRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por permissão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Todas as permissões</span>
              </div>
            </SelectItem>
            <SelectItem value="admin">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span>Administradores</span>
              </div>
            </SelectItem>
            <SelectItem value="user">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span>Usuários</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Status */}
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>Todos os status</span>
              </div>
            </SelectItem>
            <SelectItem value="active">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Ativos</span>
              </div>
            </SelectItem>
            <SelectItem value="inactive">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Inativos</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contador de Resultados */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
        <span>
          Mostrando <strong>{filteredUsers}</strong> de <strong>{totalUsers}</strong> usuários
        </span>

        {hasActiveFilters && (
          <span className="text-blue-600">
            {filteredUsers < totalUsers ? 'Filtros aplicados' : 'Sem filtros'}
          </span>
        )}
      </div>
    </div>
  );
}
