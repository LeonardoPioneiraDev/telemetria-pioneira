// src/app/(auth)/first-login/page.tsx
import { KeyRound } from 'lucide-react';
import { Suspense } from 'react';
import FirstLoginClientPage from './FirstLoginClientPage';

// Componente de loading
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-cyan-200 rounded-full animate-spin border-t-cyan-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-cyan-600 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-cyan-300 font-medium">Validando convite de primeiro acesso...</p>
      </div>
    </div>
  );
}

export default function FirstLoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FirstLoginClientPage />
    </Suspense>
  );
}
