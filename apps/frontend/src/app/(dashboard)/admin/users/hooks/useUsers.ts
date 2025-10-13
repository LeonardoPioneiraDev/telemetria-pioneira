/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(dashboard)/admin/users/hooks/useUsers.ts
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user' | 'moderator' | 'viewer';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  fullName: string;
  password?: string;
  role?: 'admin' | 'user' | 'moderator' | 'viewer';
  status?: 'active' | 'inactive' | 'pending';
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
  role?: 'admin' | 'user' | 'moderator' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // CORRIGIDO: fetchUsers agora aceita parâmetros de paginação e filtro
  const fetchUsers = async (params: { page?: number; limit?: number; search?: string } = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Constrói os parâmetros da URL
      const queryParams = new URLSearchParams({
        page: String(params.page || pagination.page),
        limit: String(params.limit || pagination.limit),
      });
      if (params.search) {
        queryParams.set('search', params.search);
      }

      const response = await api.get(`/users?${queryParams.toString()}`);

      // ✅ CORREÇÃO PRINCIPAL: Extrai os dados e a paginação corretamente
      const responseData = response.data.data; // O array de usuários
      const paginationData = response.data.pagination; // O objeto de paginação

      setUsers(responseData || []);
      if (paginationData) {
        setPagination({
          page: paginationData.page,
          limit: paginationData.limit,
          total: paginationData.total,
          totalPages: Math.ceil(paginationData.total / paginationData.limit),
        });
      }
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);

      let errorMessage = 'Erro ao carregar usuários';

      if (err.response?.status === 403) {
        errorMessage = 'Você não tem permissão para acessar esta funcionalidade';
      } else if (err.response?.status === 401) {
        errorMessage = 'Sua sessão expirou. Faça login novamente';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
      toast.error('Erro', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar usuário
  const createUser = async (userData: CreateUserData): Promise<{ success: boolean }> => {
    try {
      const response = await api.post('/auth/users', userData);
      
      // Atualizar a lista de usuários
      await fetchUsers();

      toast.success('Usuário criado!', {
        description: 'O usuário receberá um email para definir sua senha.',
      });

      return {
        success: true
      };
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          toast.error('Erro de validação', {
            description: errors[0],
          });
        }
      } else if (err.response?.data?.message) {
        toast.error('Erro ao criar usuário', {
          description: err.response.data.message,
        });
      } else {
        toast.error('Erro ao criar usuário', {
          description: 'Tente novamente.',
        });
      }
      
      return {
        success: false
      };
    }
  };

  // Atualizar usuário
  const updateUser = async (userId: string, userData: UpdateUserData): Promise<boolean> => {
    try {
      const response = await api.put(`/auth/users/${userId}`, userData);
      const updatedUser = response.data.data || response.data;

      setUsers(prev => prev.map(user => (user.id === userId ? { ...user, ...updatedUser } : user)));

      toast.success('Usuário atualizado!', {
        description: 'As informações foram salvas com sucesso.',
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      toast.error('Erro ao atualizar usuário', {
        description: err.response?.data?.message || 'Tente novamente.',
      });
      return false;
    }
  };

  // Deletar usuário
  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers(prev => prev.filter(user => user.id !== userId));

      toast.success('Usuário removido!', {
        description: 'O usuário foi excluído do sistema.',
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao deletar usuário:', err);
      toast.error('Erro ao remover usuário', {
        description: err.response?.data?.message || 'Tente novamente.',
      });
      return false;
    }
  };

  // Reset de senha
  const resetUserPassword = async (userId: string): Promise<boolean> => {
    try {
      await api.post(`/auth/users/${userId}/reset-password-admin`);

      toast.success('Email enviado!', {
        description: 'O usuário receberá um email para redefinir a senha.',
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao resetar senha:', err);
      if (err.response?.data?.error === 'CANNOT_RESET_SELF') {
        toast.error('Ação não permitida', {
          description: 'Você não pode resetar sua própria senha por aqui.',
        });
      } else {
        toast.error('Erro ao enviar email', {
          description: err.response?.data?.message || 'Tente novamente.',
        });
      }
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    pagination,
    resetUserPassword,
  };
};
