// src/components/changelog/ChangelogModal.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangelogEntry, ChangelogEntryType } from '@/types/changelog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Rocket, Sparkles, Wrench } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ChangelogEntry[];
  isLoading: boolean;
  unreadCount?: number;
}

const typeConfig: Record<ChangelogEntryType, { label: string; icon: React.ReactNode; color: string }> = {
  feature: {
    label: 'Novidade',
    icon: <Rocket className="h-4 w-4" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  improvement: {
    label: 'Melhoria',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  fix: {
    label: 'Correção',
    icon: <Wrench className="h-4 w-4" />,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  },
};

function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  const config = typeConfig[entry.type];
  const publishedDate = parseISO(entry.published_at);

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config.color}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
          <Badge variant="secondary" className="text-xs">
            v{entry.version}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(publishedDate, "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>
      <h4 className="font-semibold text-foreground mb-1">{entry.title}</h4>
      <p className="text-sm text-muted-foreground">{entry.description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
      <h4 className="font-semibold text-lg mb-2">Tudo em dia!</h4>
      <p className="text-muted-foreground text-sm">
        Você já viu todas as novidades do sistema.
      </p>
    </div>
  );
}

export function ChangelogModal({
  isOpen,
  onClose,
  entries,
  isLoading,
  unreadCount = 0,
}: ChangelogModalProps) {
  const hasEntries = entries.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Novidades do Sistema
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Confira as últimas atualizações e melhorias do sistema.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : hasEntries ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <ChangelogEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
