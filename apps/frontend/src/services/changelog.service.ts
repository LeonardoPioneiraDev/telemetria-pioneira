// src/services/changelog.service.ts

import { api } from '@/lib/api';
import {
  ChangelogEntry,
  HasUnreadResponse,
  MarkReadResponse,
  UnreadChangelogResponse,
} from '@/types/changelog';

export const changelogService = {
  /**
   * Lista todas as entradas do changelog com status de leitura
   */
  async getAll(): Promise<ChangelogEntry[]> {
    const response = await api.get<ChangelogEntry[]>('/changelog');
    return response.data;
  },

  /**
   * Busca entradas não lidas pelo usuário
   */
  async getUnread(): Promise<UnreadChangelogResponse> {
    const response = await api.get<UnreadChangelogResponse>('/changelog/unread');
    return response.data;
  },

  /**
   * Verifica rapidamente se há entradas não lidas
   */
  async hasUnread(): Promise<HasUnreadResponse> {
    const response = await api.get<HasUnreadResponse>('/changelog/has-unread');
    return response.data;
  },

  /**
   * Marca todas as entradas como lidas
   */
  async markAllAsRead(): Promise<MarkReadResponse> {
    const response = await api.post<MarkReadResponse>('/changelog/mark-read');
    return response.data;
  },
};
