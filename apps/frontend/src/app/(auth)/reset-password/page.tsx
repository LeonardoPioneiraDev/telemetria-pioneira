// src/app/(auth)/reset-password/page.tsx
import { KeyRound } from 'lucide-react';
import { Suspense } from 'react';
import ResetPasswordClientPage from './ResetPasswordClientPage';

// Componente de loading
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-purple-600 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-purple-300 font-medium">Carregando...</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordClientPage />
    </Suspense>
  );
}
