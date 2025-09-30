// // src/hooks/useAuthExtended.ts
// import { useAuth } from '@/contexts/AuthContext';
// import { api } from '@/lib/api';
// import { useQueryClient } from '@tanstack/react-query';

// export const useAuthExtended = () => {
//   const auth = useAuth();
//   const queryClient = useQueryClient();

//   // Função de logout que limpa o cache
//   const logoutWithCacheCleanup = async () => {
//     try {
//       // Limpar todos os caches relacionados ao usuário
//       queryClient.clear(); // Remove todas as queries do cache

//       // Ou ser mais específico:
//       // queryClient.removeQueries({ queryKey: ['user-profile'] });
//       // queryClient.removeQueries({ queryKey: ['user-data'] });

//       // Executar logout original
//       await auth.logout();
//     } catch (error) {
//       console.error('Erro durante logout:', error);
//       // Mesmo com erro, limpar cache e fazer logout
//       queryClient.clear();
//       auth.logout();
//     }
//   };

//   const forgotPassword = async (email: string) => {
//     try {
//       await api.post('/auth/password/reset-request', { email });
//     } catch (error) {
//       console.error('Erro ao solicitar recuperação de senha:', error);
//       throw error;
//     }
//   };

//   const resetPassword = async (token: string, newPassword: string, confirmPassword: string) => {
//     try {
//       await api.post('/auth/password/reset', {
//         token,
//         newPassword,
//         confirmPassword,
//       });
//     } catch (error) {
//       console.error('Erro ao redefinir senha:', error);
//       throw error;
//     }
//   };

//   const firstLogin = async (token: string, tempPassword: string, newPassword: string) => {
//     try {
//       await api.post('/auth/first-login', {
//         token,
//         tempPassword,
//         newPassword,
//       });
//     } catch (error) {
//       console.error('Erro no primeiro login:', error);
//       throw error;
//     }
//   };

//   // Função de login que invalida cache antigo
//   const loginWithCacheRefresh = async (credentials: unknown) => {
//     try {
//       // Limpar cache antes do login
//       queryClient.clear();

//       // Executar login original
//       const result = await auth.login(credentials);

//       // Após login bem-sucedido, invalidar queries para buscar dados frescos
//       queryClient.invalidateQueries({ queryKey: ['user-profile'] });

//       return result;
//     } catch (error) {
//       console.error('Erro durante login:', error);
//       throw error;
//     }
//   };

//   return {
//     ...auth,
//     logout: logoutWithCacheCleanup, // Sobrescrever logout
//     login: loginWithCacheRefresh, // Sobrescrever login se necessário
//     forgotPassword,
//     resetPassword,
//     firstLogin,
//   };
// };
// src/hooks/useAuthExtended.ts
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export const useAuthExtended = () => {
  const auth = useAuth();
  const queryClient = useQueryClient();

  // Função de logout que limpa o cache
  const logoutWithCacheCleanup = () => {
    // Limpar cache antes do logout
    queryClient.clear();

    // Executar logout original (que já limpa localStorage e redireciona)
    auth.logout();
  };

  const forgotPassword = async (email: string) => {
    try {
      await api.post('/auth/password/reset-request', { email });
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      await api.post('/auth/password/reset', {
        token,
        newPassword,
        confirmPassword,
      });
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      throw error;
    }
  };

  const firstLogin = async (token: string, tempPassword: string, newPassword: string) => {
    try {
      await api.post('/auth/first-login', {
        token,
        tempPassword,
        newPassword,
      });
    } catch (error) {
      console.error('Erro no primeiro login:', error);
      throw error;
    }
  };

  return {
    ...auth,
    logout: logoutWithCacheCleanup, // Sobrescrever logout para limpar cache
    forgotPassword,
    resetPassword,
    firstLogin,
  };
};
