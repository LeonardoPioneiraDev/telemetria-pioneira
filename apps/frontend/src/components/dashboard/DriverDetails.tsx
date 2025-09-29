// // apps/telemetria-web/src/components/dashboard/DriverDetails.tsx
// 'use client';

// import { ReportActions } from '@/components/printable/ReportActions';
// import { PerformanceChart } from '@/components/report/PerformanceChart';
// import { PerformanceTable } from '@/components/report/PerformanceTable';
// import { ReportHeader } from '@/components/report/ReportHeader';
// import { Card, CardContent } from '@/components/ui/card';
// import { Skeleton } from '@/components/ui/skeleton';
// import { getPerformanceReport } from '@/services/telemetry.service';
// import { Driver } from '@/types/api';
// import { useQuery } from '@tanstack/react-query';
// import { AlertCircle, FileText } from 'lucide-react';

// interface DriverDetailsProps {
//   driver: Driver;
// }

// export const DriverDetails = ({ driver }: DriverDetailsProps) => {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ['performanceReport', driver.id],
//     queryFn: () => getPerformanceReport(driver.id),
//     staleTime: 1000 * 60 * 5, // Cache de 5 minutos
//   });

//   if (isLoading) {
//     return (
//       <Card className="mt-6">
//         <CardContent className="p-6">
//           <div className="space-y-6">
//             {/* Header skeleton */}
//             <div className="space-y-4">
//               <Skeleton className="h-8 w-64" />
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <Skeleton className="h-4 w-20" />
//                   <Skeleton className="h-6 w-40" />
//                 </div>
//                 <div className="space-y-2">
//                   <Skeleton className="h-4 w-16" />
//                   <Skeleton className="h-6 w-32" />
//                 </div>
//               </div>
//             </div>

//             {/* Table skeleton */}
//             <div className="space-y-4">
//               <Skeleton className="h-6 w-48" />
//               <div className="space-y-3">
//                 {[...Array(4)].map((_, i) => (
//                   <div key={i} className="flex space-x-4">
//                     <Skeleton className="h-4 w-48" />
//                     <Skeleton className="h-4 w-16" />
//                     <Skeleton className="h-4 w-16" />
//                     <Skeleton className="h-4 w-16" />
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Chart skeleton */}
//             <div className="space-y-4">
//               <Skeleton className="h-6 w-40" />
//               <Skeleton className="h-64 w-full" />
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     );
//   }

//   if (error) {
//     return (
//       <Card className="mt-6">
//         <CardContent className="p-6">
//           <div className="text-center py-12">
//             <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
//             <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar relatório</h3>
//             <p className="text-gray-500 mb-4">
//               Não foi possível carregar os dados de desempenho do motorista.
//             </p>
//             <p className="text-sm text-gray-400">
//               {error instanceof Error ? error.message : 'Erro desconhecido'}
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     );
//   }

//   if (!data) {
//     return (
//       <Card className="mt-6">
//         <CardContent className="p-6">
//           <div className="text-center py-12">
//             <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//             <h3 className="text-lg font-medium text-gray-900 mb-2">Relatório não encontrado</h3>
//             <p className="text-gray-500">
//               Não há dados de telemetria disponíveis para este motorista.
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     );
//   }

//   const { driverInfo, reportDetails, performanceSummary } = data;

//   return (
//     <div className="mt-6 space-y-6">
//       {/* Ações do relatório */}
//       <ReportActions
//         driverInfo={driverInfo}
//         reportDetails={reportDetails}
//         performanceSummary={performanceSummary}
//       />

//       {/* Conteúdo do relatório */}
//       <Card>
//         <CardContent className="p-6">
//           <ReportHeader driverInfo={driverInfo} reportDetails={reportDetails} />
//           <PerformanceTable
//             periods={performanceSummary.periods}
//             metrics={performanceSummary.metrics}
//           />
//           <PerformanceChart
//             periods={performanceSummary.periods}
//             metrics={performanceSummary.metrics}
//           />
//         </CardContent>
//       </Card>
//     </div>
//   );
// };
// apps/telemetria-web/src/components/dashboard/DriverDetails.tsx
'use client';

import { ReportActions } from '@/components/printable/ReportActions';
import { PerformanceChart } from '@/components/report/PerformanceChart';
import { PerformanceTable } from '@/components/report/PerformanceTable';
import { ReportHeader } from '@/components/report/ReportHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPerformanceReport } from '@/services/telemetry.service';
import { Driver } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText } from 'lucide-react';

interface DriverDetailsProps {
  driver: Driver;
  reportDate?: Date; // ✅ Adicionar prop reportDate
}

export const DriverDetails = ({ driver, reportDate }: DriverDetailsProps) => {
  const { data, isLoading, error } = useQuery({
    // ✅ Incluir reportDate na query key para invalidar quando mudar
    queryKey: ['performanceReport', driver.id, reportDate?.toISOString()],
    queryFn: () => getPerformanceReport(driver.id, reportDate), // ✅ Passar reportDate
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            </div>

            {/* Table skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar relatório</h3>
            <p className="text-gray-500 mb-4">
              Não foi possível carregar os dados de desempenho do motorista.
            </p>
            <p className="text-sm text-gray-400">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Relatório não encontrado</h3>
            <p className="text-gray-500">
              Não há dados de telemetria disponíveis para este motorista.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { driverInfo, reportDetails, performanceSummary } = data;

  return (
    <div className="mt-6 space-y-6">
      {/* Ações do relatório */}
      <ReportActions
        driverInfo={driverInfo}
        reportDetails={reportDetails}
        performanceSummary={performanceSummary}
      />

      {/* Conteúdo do relatório */}
      <Card>
        <CardContent className="p-6 ">
          <ReportHeader driverInfo={driverInfo} reportDetails={reportDetails} />
          <div className="flex flex-col gap-8">
            <PerformanceTable
              periods={performanceSummary.periods}
              metrics={performanceSummary.metrics}
            />
            <PerformanceChart
              periods={performanceSummary.periods}
              metrics={performanceSummary.metrics}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
