// src/hooks/useAuthExtended.ts
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export const useAuthExtended = () => {
  const auth = useAuth();

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
      // Implementar lógica de primeiro login baseada na sua API
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
    forgotPassword,
    resetPassword,
    firstLogin,
  };
};
