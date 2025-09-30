// src/hooks/useProfile.ts
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface ProfileData {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string;
  lastLoginAt: string;
  loginAttempts: number;
  lockedUntil: string | null;
  passwordResetToken: string;
  passwordResetExpires: string;
  emailVerificationToken: string | null;
  emailVerificationExpires: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  success: boolean;
  message: string;
  data: ProfileData;
}

const fetchProfile = async (): Promise<ProfileData> => {
  const response = await api.get<ProfileResponse>('/auth/profile');

  if (!response.data.success) {
    throw new Error(response.data.message || 'Erro ao buscar perfil');
  }

  return response.data.data;
};

export const useProfile = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Limpar cache quando usuário mudar ou fazer logout
  useEffect(() => {
    if (!isAuthenticated || !user) {
      queryClient.removeQueries({ queryKey: ['user-profile'] });
    }
  }, [isAuthenticated, user?.id, queryClient, user]);

  // Se o AuthContext já tem os dados básicos do usuário, podemos usar como dados iniciais
  const query = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: fetchProfile,
    enabled: isAuthenticated && !!user && !authLoading, // Só executar se autenticado e não carregando
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    refetchOnWindowFocus: false,
    // Usar dados do AuthContext como dados iniciais para evitar loading desnecessário
    initialData: user
      ? {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          // Campos que não estão no AuthContext, mas são necessários para o tipo completo
          status: 'active',
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginAttempts: 0,
          lockedUntil: null,
          passwordResetToken: '',
          passwordResetExpires: '',
          emailVerificationToken: null,
          emailVerificationExpires: null,
          tokenVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : undefined,
  });

  return query;
};
