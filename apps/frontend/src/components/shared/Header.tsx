// src/components/shared/Header.tsx
'use client';

import { ChangelogButton } from '@/components/changelog/ChangelogButton';
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
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="bg-black rounded-lg flex-shrink-0">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="rounded-lg sm:w-[60px] sm:h-[60px]" />
              </div>
              <div className="min-w-0">
                {/* Título completo no desktop, abreviado no mobile */}
                <h1 className="text-base sm:text-xl font-bold text-white truncate">
                  <span className="hidden sm:inline">Viação Pioneira - Telemetria</span>
                  <span className="sm:hidden">Viação Pioneira -</span>
                </h1>
                <h1 className="sm:hidden text-base font-bold text-white truncate">Telemetria</h1>
                <p className="text-xs text-yellow-400">Dashboard de Performance</p>
              </div>
            </div>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
            {/* Botão de Novidades */}
            <ChangelogButton />

            {/* Dropdown do Usuário */}
            <UserDropdown />

            {/* Separador - esconde no mobile muito pequeno */}
            <div className="hidden xs:block h-6 w-px bg-yellow-400/30" />

            {/* Botão de logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-300 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 px-2 sm:px-3"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
