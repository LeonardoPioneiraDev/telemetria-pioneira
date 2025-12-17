// apps/telemetria-web/src/components/dashboard/DriverSearch.tsx
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { searchDrivers } from '@/services/telemetry.service';
import { Driver } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { Search, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DriverSearchProps {
  onDriverSelect: (driver: Driver | null) => void;
  selectedDriver: Driver | null;
}

export const DriverSearch = ({ onDriverSelect, selectedDriver }: DriverSearchProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce da busca (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Query para buscar motoristas
  const {
    data: drivers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['drivers', debouncedQuery],
    queryFn: () => searchDrivers(debouncedQuery),
    enabled: debouncedQuery.length >= 2, // Só busca com 2+ caracteres
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });

  // Mostrar resultados quando há busca
  useEffect(() => {
    setShowResults(debouncedQuery.length >= 2);
  }, [debouncedQuery]);

  // Fechar resultados ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para selecionar motorista
  const handleDriverSelect = useCallback(
    (driver: Driver) => {
      onDriverSelect(driver);
      setShowResults(false);
      setQuery(''); // Limpa a busca após seleção
    },
    [onDriverSelect]
  );

  // Função para limpar seleção
  const handleClearSelection = useCallback(() => {
    onDriverSelect(null);
    setQuery('');
    setShowResults(false);
  }, [onDriverSelect]);

  // Função para obter iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-full space-y-4">
      {/* Motorista selecionado */}
      {selectedDriver && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(selectedDriver.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-blue-900">{selectedDriver.name}</p>
              <p className="text-sm text-blue-600">Crachá: {selectedDriver.employee_number}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
            <span className="ml-1">Limpar</span>
          </Button>
        </div>
      )}

      {/* Campo de busca */}
      {!selectedDriver && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite o nome ou crachá do motorista..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => {
                if (debouncedQuery.length >= 2) {
                  setShowResults(true);
                }
              }}
              className={cn(
                'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none',
                'placeholder:text-gray-500 text-sm',
                'transition-all duration-200'
              )}
            />

          </div>

          {/* Dropdown de resultados */}
          {showResults && (
            <div
              ref={resultsRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden"
            >
              {/* Loading state */}
              {isLoading && (
                <div className="p-4 space-y-3">
                  <div className="text-sm text-gray-500 mb-2">Buscando motoristas...</div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && drivers.length === 0 && (
                <div className="p-6 text-center">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Nenhum motorista encontrado</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tente buscar por nome ou número do crachá
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="p-4 text-center text-red-500">
                  <p className="text-sm">Erro ao buscar motoristas</p>
                  <p className="text-xs text-gray-400 mt-1">Tente novamente</p>
                </div>
              )}

              {/* Results */}
              {!isLoading && drivers.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                    {drivers.length} motorista(s) encontrado(s)
                  </div>

                  {/* Scroll com altura menor para testar */}
                  <div className="max-h-48 overflow-y-auto">
                    {' '}
                    {/* 192px = ~3.3 itens */}
                    {drivers.map(driver => (
                      <button
                        key={driver.id}
                        onClick={() => handleDriverSelect(driver)}
                        className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors duration-150 text-left border-b border-gray-100 last:border-b-0"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-100 text-gray-600">
                            {getInitials(driver.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{driver.name}</p>
                          <p className="text-sm text-gray-500">Crachá: {driver.employee_number}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
