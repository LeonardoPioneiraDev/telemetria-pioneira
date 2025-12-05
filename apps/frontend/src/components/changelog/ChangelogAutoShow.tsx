// src/components/changelog/ChangelogAutoShow.tsx
'use client';

import { changelogService } from '@/services/changelog.service';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ChangelogModal } from './ChangelogModal';

const SESSION_KEY = 'changelog_shown_this_session';

/**
 * Componente que automaticamente mostra o modal de changelog
 * quando há entradas não lidas e é a primeira vez nesta sessão.
 */
export function ChangelogAutoShow() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(true);

  // Verifica no mount se já mostramos nesta sessão
  useEffect(() => {
    const shown = sessionStorage.getItem(SESSION_KEY);
    setHasShownThisSession(shown === 'true');
  }, []);

  // Query para verificar se há não lidas
  const { data: unreadData, isLoading } = useQuery({
    queryKey: ['changelog', 'unread', 'auto-show'],
    queryFn: () => changelogService.getUnread(),
    enabled: !hasShownThisSession,
    staleTime: 1000 * 60 * 5,
  });

  // Abre o modal automaticamente se houver não lidas
  useEffect(() => {
    if (!hasShownThisSession && unreadData?.hasUnread && unreadData.entries.length > 0) {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_KEY, 'true');
      setHasShownThisSession(true);
    }
  }, [hasShownThisSession, unreadData]);

  const handleClose = async () => {
    // Marca como lido ao fechar
    if (unreadData?.hasUnread) {
      try {
        await changelogService.markAllAsRead();
      } catch (error) {
        console.error('Erro ao marcar changelog como lido:', error);
      }
    }
    setIsOpen(false);
  };

  // Não renderiza nada se não há entradas para mostrar
  if (!unreadData?.entries.length) {
    return null;
  }

  return (
    <ChangelogModal
      isOpen={isOpen}
      onClose={handleClose}
      entries={unreadData.entries}
      isLoading={isLoading}
      unreadCount={unreadData.count}
    />
  );
}
