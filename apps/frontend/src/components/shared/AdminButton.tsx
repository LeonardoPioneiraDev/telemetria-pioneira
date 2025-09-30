// src/components/shared/AdminButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const AdminButton = () => {
  const { isAdmin, isLoading } = useRoleAccess();
  const router = useRouter();

  // Não renderiza nada se estiver carregando ou não for admin
  if (isLoading || !isAdmin()) {
    return null;
  }

  const handleAdminAccess = () => {
    router.push('/admin/users');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleAdminAccess}
      className="text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all duration-200 group"
      title="Administração de Usuários"
    >
      <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
      <span className="hidden lg:inline">Admin</span>
    </Button>
  );
};
