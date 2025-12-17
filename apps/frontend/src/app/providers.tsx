// apps/telemetria-web/src/app/providers.tsx
'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { PageTrackingProvider } from '@/contexts/PageTrackingContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PageTrackingProvider>
          {children}
          <Toaster />
        </PageTrackingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
