// src/app/(dashboard)/admin/users/components/UserTable.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Edit,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { User } from '../hooks/useUsers';
import { DeleteUserDialog } from './DeleteUserDialog';
import { UserDialog } from './UserDialog';

interface UserTableProps {
  users: User[];
  loading: boolean;
  onUpdateUser: (userId: string, data: any) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onResetPassword: (userId: string) => Promise<boolean>;
}

export function UserTable({
  users,
  loading,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
}: UserTableProps) {
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  const handleResetPassword = async (userId: string) => {
    setResettingPassword(userId);
    await onResetPassword(userId);
    setResettingPassword(null);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Admin</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center space-x-1">
        <UserCheck className="h-3 w-3" />
        <span>Usuário</span>
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-500 hover:bg-red-600 text-white">
        Inativo
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-500">Carregando usuários...</p>
          </div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Nenhum usuário encontrado</h3>
              <p className="text-gray-500 mt-1">
                Não há usuários que correspondam aos filtros aplicados.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Usuário</TableHead>
            <TableHead className="font-semibold">Permissão</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Criado em</TableHead>
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{getRoleBadge(user.role)}</TableCell>
              <TableCell>{getStatusBadge(user.isActive)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Editar Usuário */}
                    <UserDialog
                      user={user}
                      onSave={data => onUpdateUser(user.id, data)}
                      trigger={
                        <DropdownMenuItem onSelect={e => e.preventDefault()}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar usuário
                        </DropdownMenuItem>
                      }
                    />

                    {/* Reset de Senha */}
                    <DropdownMenuItem
                      onClick={() => handleResetPassword(user.id)}
                      disabled={resettingPassword === user.id}
                    >
                      {resettingPassword === user.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando email...
                        </>
                      ) : (
                        <>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Resetar senha
                        </>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Deletar Usuário */}
                    <DeleteUserDialog user={user} onDelete={onDeleteUser} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
