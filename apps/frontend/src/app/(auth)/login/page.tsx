// src/app/(auth)/login/page.tsx
import { Award } from 'lucide-react';
import { Suspense } from 'react';
import LoginClientPage from './LoginClientPage';

// Componente de loading
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Award className="h-5 w-5 text-blue-600 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-blue-300 font-medium">Carregando...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginClientPage />
    </Suspense>
  );
}
