// src/components/etl/RefreshButton.tsx

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function RefreshButton({ onRefresh, isRefreshing }: RefreshButtonProps) {
  return (
    <Button
      onClick={onRefresh}
      disabled={isRefreshing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      Atualizar
    </Button>
  );
}
