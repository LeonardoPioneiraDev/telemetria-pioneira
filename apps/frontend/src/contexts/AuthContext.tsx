// // apps/telemetria-web/src/contexts/AuthContext.tsx
// 'use client';

// import { api } from '@/lib/api';
// import { AuthResponse } from '@/types/api';
// import { useRouter } from 'next/navigation';
// import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// interface AuthContextType {
//   isAuthenticated: boolean;
//   isLoading: boolean;
//   login: (data: any) => Promise<void>;
//   logout: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       // Importante: garantir que o token ainda é válido na API seria o próximo nível de segurança
//       api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//       setIsAuthenticated(true);
//     }
//     setIsLoading(false);
//   }, []);

//   const login = async (data: any) => {
//     try {
//       const response = await api.post<AuthResponse>('/auth/login', data);
//       const { accessToken } = response.data.data;

//       localStorage.setItem('accessToken', accessToken);
//       api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
//       setIsAuthenticated(true);

//       router.push('/dashboard');
//     } catch (error) {
//       console.error('Falha no login:', error);
//       throw error;
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem('accessToken');
//     delete api.defaults.headers.common['Authorization'];
//     setIsAuthenticated(false);
//     router.push('/login');
//   };

//   return (
//     <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth deve ser usado dentro de um AuthProvider');
//   }
//   return context;
// };
// apps/telemetria-web/src/contexts/AuthContext.tsx
'use client';

import { api } from '@/lib/api';
import { AuthResponse } from '@/types/api'; // Supondo que você tenha um arquivo de tipos
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Vamos definir a interface do usuário para usar no contexto
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
  user: User | null; // <-- NOVO: Estado para o usuário
  login: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null); // <-- NOVO: State para o usuário
  const [isLoading, setIsLoading] = useState<boolean>(true); // Começa como true
  const router = useRouter();

  // MODIFICADO: Lógica para verificar o token e buscar o perfil do usuário
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          // Define o token no header do axios para a próxima requisição
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Busca os dados do usuário na API para validar o token e obter dados frescos
          const response = await api.get<{ data: User }>('/auth/profile');
          const userData = response.data.data;

          setUser(userData); // Armazena os dados do usuário
          setIsAuthenticated(true);
        } catch (error) {
          // Se a busca falhar (token expirado/inválido), limpa tudo
          console.error('Sessão inválida, limpando...', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
    // A função logout não precisa ser uma dependência aqui para evitar loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MODIFICADO: Lógica de login para armazenar os dados do usuário
  const login = async (data: any) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);
      const { accessToken, user: userData } = response.data.data;

      // Armazena o token e os dados do usuário
      localStorage.setItem('accessToken', accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      setUser(userData); // <-- ARMAZENA O USUÁRIO NO ESTADO
      setIsAuthenticated(true);

      // Redireciona para o dashboard ou outra página protegida
      router.push('/dashboard');
    } catch (error) {
      console.error('Falha no login:', error);
      // Limpa o estado em caso de falha para garantir consistência
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null); // Limpa o usuário do estado
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
