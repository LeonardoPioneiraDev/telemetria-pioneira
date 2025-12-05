// src/components/changelog/ChangelogButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useChangelog } from '@/hooks/useChangelog';
import { cn } from '@/lib/utils';
import { Bell } from 'lucide-react';
import { ChangelogModal } from './ChangelogModal';

export function ChangelogButton() {
  const {
    isModalOpen,
    hasUnread,
    unreadCount,
    entries,
    isLoadingEntries,
    openModal,
    closeModal,
  } = useChangelog();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openModal}
        className={cn(
          'relative text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all duration-200',
          hasUnread && 'text-yellow-400'
        )}
        title="Novidades do sistema"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </Button>

      <ChangelogModal
        isOpen={isModalOpen}
        onClose={closeModal}
        entries={entries}
        isLoading={isLoadingEntries}
        unreadCount={unreadCount}
      />
    </>
  );
}
