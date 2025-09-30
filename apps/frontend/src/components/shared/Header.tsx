// src/components/shared/Header.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useAuthExtended } from '@/hooks/useAuthExtended'; // Usar o extended
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { UserDropdown } from './UserDropdown';

export const Header = () => {
  const { logout } = useAuthExtended(); // Usar logout que limpa cache

  return (
    <header className="bg-black/95 backdrop-blur-md border-b border-yellow-400/20 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo e Título */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="bg-black rounded-lg">
                <Image src="/logo.png" alt="Logo" width={60} height={60} className="rounded-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Viação Pioneira - Telemetria</h1>
                <p className="text-xs text-yellow-400">Dashboard de Performance</p>
              </div>
            </div>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center space-x-3">
            {/* Dropdown do Usuário */}
            <UserDropdown />

            {/* Separador */}
            <div className="h-6 w-px bg-yellow-400/30" />

            {/* Botão de logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-300 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
