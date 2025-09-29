// apps/telemetria-web/src/app/(auth)/forgot-password/ForgotPasswordClientPage.tsx
'use client';

import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordClientPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Usando nossa instância do axios para chamar a API
      await api.post('/auth/password/reset-request', { email });
      setIsSuccess(true);
    } catch (err: any) {
      // Exibe uma mensagem genérica para o usuário
      setError(err.response?.data?.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Se o formulário foi enviado com sucesso, exibe a tela de confirmação
  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900">✅ Verifique seu E-mail</h2>
          <p className="text-gray-600">
            Se um usuário com o e-mail <strong>{email}</strong> existir em nosso sistema, nós
            enviamos um link para redefinição de senha.
          </p>
          <p className="text-sm text-gray-500">
            O link expira em 1 hora. Se não receber, verifique sua caixa de spam.
          </p>
          <div>
            <Link
              href="/login"
              className="inline-block w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
            >
              Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulário principal
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <Image
            src="/logo.png" // Certifique-se que o logo existe em /public/logo.png
            alt="Logo"
            width={180}
            height={50}
            className="mx-auto mb-4"
            priority
          />
          <h2 className="text-2xl font-bold text-gray-900">Recuperar Senha</h2>
          <p className="mt-2 text-sm text-gray-600">
            Digite seu e-mail para receber o link de redefinição.
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Lembrou a senha? Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
