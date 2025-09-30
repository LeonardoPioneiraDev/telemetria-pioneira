/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/contexts/AuthContext.tsx
'use client';

import { api } from '@/lib/api';
import { AuthResponse } from '@/types/api';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Função para buscar perfil do usuário
  const fetchUserProfile = async (): Promise<User | null> => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        const profileData = response.data.data;
        return {
          id: profileData.id,
          email: profileData.email,
          username: profileData.username,
          fullName: profileData.fullName,
          role: profileData.role,
          permissions: profileData.permissions || [],
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Buscar perfil do usuário
          const userData = await fetchUserProfile();

          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Se não conseguir buscar o perfil, limpar tudo
            logout();
          }
        } catch (error) {
          console.error('Sessão inválida, limpando...', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: any) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);
      const { accessToken } = response.data.data;

      // Armazenar token
      localStorage.setItem('accessToken', accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Buscar dados do usuário após login bem-sucedido
      const userData = await fetchUserProfile();

      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        router.push('/dashboard');
      } else {
        throw new Error('Não foi possível obter dados do usuário');
      }
    } catch (error) {
      console.error('Falha no login:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
