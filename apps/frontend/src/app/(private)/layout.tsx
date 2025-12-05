// apps/telemetria-web/src/app/(private)/layout.tsx
'use client';

import { ChangelogAutoShow } from '@/components/changelog/ChangelogAutoShow';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Carregando...</div>; // Ou um componente de Spinner/Loading mais bonito
  }

  if (!isAuthenticated) {
    return null; // Evita renderizar o conteúdo da página antes do redirecionamento
  }

  return (
    <>
      <ChangelogAutoShow />
      {children}
    </>
  );
}
