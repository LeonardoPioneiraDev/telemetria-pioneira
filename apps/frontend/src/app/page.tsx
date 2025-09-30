// src/app/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Mostrar loading enquanto verifica autenticação
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          <span className="text-white text-lg">Carregando...</span>
        </div>
        <p className="text-gray-400 text-sm">Verificando autenticação</p>
      </div>
    </div>
  );
}
