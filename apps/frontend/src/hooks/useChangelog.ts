// src/hooks/useChangelog.ts

import { changelogService } from '@/services/changelog.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

const CHANGELOG_QUERY_KEY = ['changelog'];
const CHANGELOG_UNREAD_KEY = ['changelog', 'unread'];
const CHANGELOG_HAS_UNREAD_KEY = ['changelog', 'has-unread'];

export function useChangelog() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Query para verificar se há entradas não lidas (leve, para o badge)
  const {
    data: hasUnreadData,
    isLoading: isCheckingUnread,
  } = useQuery({
    queryKey: CHANGELOG_HAS_UNREAD_KEY,
    queryFn: () => changelogService.hasUnread(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });

  // Query para buscar entradas não lidas (usado quando abre o modal)
  const {
    data: unreadData,
    isLoading: isLoadingUnread,
    refetch: refetchUnread,
  } = useQuery({
    queryKey: CHANGELOG_UNREAD_KEY,
    queryFn: () => changelogService.getUnread(),
    enabled: false, // Só carrega quando solicitado
  });

  // Query para buscar todas as entradas
  const {
    data: allEntries,
    isLoading: isLoadingAll,
    refetch: refetchAll,
  } = useQuery({
    queryKey: CHANGELOG_QUERY_KEY,
    queryFn: () => changelogService.getAll(),
    enabled: false, // Só carrega quando solicitado
  });

  // Mutation para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: () => changelogService.markAllAsRead(),
    onSuccess: () => {
      // Invalida as queries para atualizar o estado
      queryClient.invalidateQueries({ queryKey: CHANGELOG_HAS_UNREAD_KEY });
      queryClient.invalidateQueries({ queryKey: CHANGELOG_UNREAD_KEY });
      queryClient.invalidateQueries({ queryKey: CHANGELOG_QUERY_KEY });
    },
  });

  // Abre o modal e carrega os dados
  const openModal = useCallback(async () => {
    setIsModalOpen(true);
    await refetchUnread();
  }, [refetchUnread]);

  // Fecha o modal e marca como lido
  const closeModal = useCallback(async () => {
    // Marca como lido ao fechar (Optimistic UI)
    if (hasUnreadData?.hasUnread) {
      markAllAsReadMutation.mutate();
    }
    setIsModalOpen(false);
  }, [hasUnreadData?.hasUnread, markAllAsReadMutation]);

  // Abre o modal mostrando todas as entradas (histórico)
  const openFullHistory = useCallback(async () => {
    setIsModalOpen(true);
    await refetchAll();
  }, [refetchAll]);

  return {
    // Estado
    isModalOpen,
    hasUnread: hasUnreadData?.hasUnread ?? false,
    unreadCount: hasUnreadData?.count ?? 0,
    entries: unreadData?.entries ?? allEntries ?? [],

    // Loading states
    isCheckingUnread,
    isLoadingEntries: isLoadingUnread || isLoadingAll,
    isMarkingAsRead: markAllAsReadMutation.isPending,

    // Actions
    openModal,
    closeModal,
    openFullHistory,
    markAllAsRead: () => markAllAsReadMutation.mutate(),
  };
}
