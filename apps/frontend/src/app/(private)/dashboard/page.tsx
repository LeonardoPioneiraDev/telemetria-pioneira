// apps/telemetria-web/src/app/(private)/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { searchDrivers } from '@/services/telemetry.service';
import { Driver } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DashboardPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');

  // useQuery para buscar os motoristas
  const {
    data: drivers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['drivers', query],
    queryFn: () => searchDrivers(query),
    enabled: false, // A busca só será ativada manualmente
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      refetch(); // Executa a busca
    }
  };

  const handleDriverSelect = (driverId: number) => {
    router.push(`/report/${driverId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Dashboard de Telemetria</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900">Buscar Motorista</h2>
            <form onSubmit={handleSearch} className="mt-4 sm:flex sm:items-center">
              <div className="w-full sm:max-w-xs">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Digite o nome ou crachá..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {isLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            <div className="mt-6">
              {drivers && drivers.length > 0 && (
                <ul className="divide-y divide-gray-200">
                  {drivers.map((driver: Driver) => (
                    <li
                      key={driver.id}
                      onClick={() => handleDriverSelect(driver.id)}
                      className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-indigo-600">{driver.name}</p>
                        <p className="text-sm text-gray-500">Crachá: {driver.employee_number}</p>
                      </div>
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </li>
                  ))}
                </ul>
              )}
              {drivers && drivers.length === 0 && query && (
                <p className="text-center text-gray-500 mt-4">Nenhum motorista encontrado.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
