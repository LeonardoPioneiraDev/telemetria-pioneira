// src/types/changelog.ts

export type ChangelogEntryType = 'feature' | 'improvement' | 'fix';

export interface ChangelogEntry {
  id: number;
  version: string;
  title: string;
  description: string;
  type: ChangelogEntryType;
  published_at: string;
  created_at: string;
  isRead?: boolean;
}

export interface UnreadChangelogResponse {
  hasUnread: boolean;
  count: number;
  entries: ChangelogEntry[];
}

export interface HasUnreadResponse {
  hasUnread: boolean;
  count: number;
}

export interface MarkReadResponse {
  success: boolean;
}
