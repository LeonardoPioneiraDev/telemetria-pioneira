'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BrowserDistribution,
  OperatingSystemDistribution,
  PlatformDistribution,
} from '@/types/metrics';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface PlatformStatsChartsProps {
  devices: PlatformDistribution[];
  operatingSystems: OperatingSystemDistribution[];
  browsers: BrowserDistribution[];
}

// Cores para dispositivos
const DEVICE_COLORS: Record<string, string> = {
  Desktop: '#3b82f6',
  Mobile: '#10b981',
  Tablet: '#f59e0b',
  Desconhecido: '#6b7280',
};

// Cores para sistemas operacionais
const OS_COLORS: Record<string, string> = {
  Windows: '#0078d4',
  macOS: '#555555',
  iOS: '#007aff',
  Android: '#3ddc84',
  Linux: '#fcc624',
  'Chrome OS': '#4285f4',
  Outro: '#9ca3af',
  Desconhecido: '#6b7280',
};

// Cores para navegadores
const BROWSER_COLORS: Record<string, string> = {
  Chrome: '#4285f4',
  Firefox: '#ff7139',
  Safari: '#007aff',
  Edge: '#0078d4',
  Opera: '#ff1b2d',
  'Internet Explorer': '#0076d6',
  Outro: '#9ca3af',
  Desconhecido: '#6b7280',
};

const DeviceIcon = ({ deviceType }: { deviceType: string }) => {
  switch (deviceType) {
    case 'Mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'Tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

export function PlatformStatsCharts({
  devices,
  operatingSystems,
  browsers,
}: PlatformStatsChartsProps) {
  console.log('PlatformStatsCharts props:', { devices, operatingSystems, browsers });

  const deviceData = devices.map((d) => ({
    name: d.deviceType,
    value: d.count,
    percentage: d.percentage,
  }));

  console.log('PlatformStatsCharts deviceData:', deviceData);

  const osData = operatingSystems.map((os) => ({
    name: os.os,
    value: os.count,
    percentage: os.percentage,
  }));

  const browserData = browsers.map((b) => ({
    name: b.browser,
    value: b.count,
    percentage: b.percentage,
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percentage: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value.toLocaleString('pt-BR')} requisicoes
          </p>
          <p className="text-sm font-medium text-emerald-600">
            {data.payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Dispositivos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Dispositivos
          </CardTitle>
          <CardDescription>Distribuicao por tipo de dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          {deviceData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Sem dados disponíveis
            </div>
          ) : (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DEVICE_COLORS[entry.name] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {deviceData.map((device) => (
                  <div key={device.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: DEVICE_COLORS[device.name] || '#6b7280' }}
                      />
                      <DeviceIcon deviceType={device.name} />
                      <span>{device.name}</span>
                    </div>
                    <span className="font-medium">{device.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sistemas Operacionais */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            Sistema Operacional
          </CardTitle>
          <CardDescription>Distribuicao por SO</CardDescription>
        </CardHeader>
        <CardContent>
          {osData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Sem dados disponiveis
            </div>
          ) : (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={osData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {osData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={OS_COLORS[entry.name] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto">
                {osData.slice(0, 5).map((os) => (
                  <div key={os.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: OS_COLORS[os.name] || '#6b7280' }}
                      />
                      <span>{os.name}</span>
                    </div>
                    <span className="font-medium">{os.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navegadores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Navegadores
          </CardTitle>
          <CardDescription>Distribuicao por browser</CardDescription>
        </CardHeader>
        <CardContent>
          {browserData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Sem dados disponiveis
            </div>
          ) : (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={browserData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {browserData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={BROWSER_COLORS[entry.name] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto">
                {browserData.slice(0, 5).map((browser) => (
                  <div key={browser.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: BROWSER_COLORS[browser.name] || '#6b7280' }}
                      />
                      <span>{browser.name}</span>
                    </div>
                    <span className="font-medium">{browser.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
