'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DriverInfo, PerformanceSummary, ReportDetails } from '@/types/api';
import { Download, Printer } from 'lucide-react';
import { useRef } from 'react';

interface PrintableFormProps {
  driverInfo: DriverInfo;
  reportDetails: ReportDetails;
  performanceSummary: PerformanceSummary;
}

export const PrintableForm = ({
  driverInfo,
  reportDetails,
  performanceSummary,
}: PrintableFormProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;

      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');

      if (printRef.current) {
        // Criar um clone do elemento para modificar as cores
        const clonedElement = printRef.current.cloneNode(true) as HTMLElement;

        // Substituir cores CSS modernas por cores simples
        const replaceColors = (element: HTMLElement) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null);

          let node;
          while ((node = walker.nextNode())) {
            const el = node as HTMLElement;
            const computedStyle = window.getComputedStyle(
              printRef.current!.querySelector(`[data-temp-id="${Math.random()}"]`) ||
                printRef.current!
            );

            // Substituir classes problemáticas por estilos inline
            if (el.classList.contains('text-red-600')) {
              el.style.color = '#dc2626';
              el.classList.remove('text-red-600');
            }
            if (el.classList.contains('text-green-600')) {
              el.style.color = '#16a34a';
              el.classList.remove('text-green-600');
            }
            if (el.classList.contains('text-yellow-600')) {
              el.style.color = '#ca8a04';
              el.classList.remove('text-yellow-600');
            }
            if (el.classList.contains('text-orange-600')) {
              el.style.color = '#ea580c';
              el.classList.remove('text-orange-600');
            }
            if (el.classList.contains('bg-gray-50')) {
              el.style.backgroundColor = '#f9fafb';
              el.classList.remove('bg-gray-50');
            }
            if (el.classList.contains('bg-gray-100')) {
              el.style.backgroundColor = '#f3f4f6';
              el.classList.remove('bg-gray-100');
            }
            if (el.classList.contains('border-gray-300')) {
              el.style.borderColor = '#d1d5db';
              el.classList.remove('border-gray-300');
            }
            if (el.classList.contains('text-gray-600')) {
              el.style.color = '#4b5563';
              el.classList.remove('text-gray-600');
            }
            if (el.classList.contains('text-gray-500')) {
              el.style.color = '#6b7280';
              el.classList.remove('text-gray-500');
            }
          }
        };

        // Adicionar o elemento clonado temporariamente ao DOM
        clonedElement.style.position = 'absolute';
        clonedElement.style.left = '-9999px';
        clonedElement.style.top = '0';
        clonedElement.style.width = printRef.current.offsetWidth + 'px';
        document.body.appendChild(clonedElement);

        replaceColors(clonedElement);

        const canvas = await html2canvas.default(clonedElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true,
        });

        // Remover o elemento temporário
        document.body.removeChild(clonedElement);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(
          `Formulario_Orientacao_${driverInfo.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        );
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente usar a função de impressão do navegador.');
    }
  };

  // Calcular total de eventos
  const totalEvents = performanceSummary.metrics.reduce((total, metric) => {
    return total + Object.values(metric.counts).reduce((sum, count) => sum + count, 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex gap-2 no-print">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Formulário
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Baixar PDF
        </Button>
      </div>

      {/* Formulário para impressão - COM CORES INLINE */}
      <Card>
        <CardContent className="p-8">
          <div ref={printRef} className="print-content" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Cabeçalho da empresa */}
            <div
              className="text-center mb-8"
              style={{ borderBottom: '2px solid #d1d5db', paddingBottom: '16px' }}
            >
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#111827',
                }}
              >
                FORMULÁRIO DE ORIENTAÇÃO
              </h1>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                SISTEMA DE TELEMETRIA VEICULAR
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Controle de Desempenho e Segurança na Condução
              </p>
            </div>

            {/* Dados do colaborador */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                    }}
                  >
                    Nome do Colaborador:
                  </label>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#111827',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {driverInfo.name}
                  </p>
                </div>
                <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                    }}
                  >
                    Número do Crachá:
                  </label>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#111827',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {driverInfo.badge || 'N/A'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                    }}
                  >
                    Data da Orientação:
                  </label>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#111827',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {reportDetails.reportDateFormatted}
                  </p>
                </div>
                <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                    }}
                  >
                    Total de Ocorrências:
                  </label>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#dc2626',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {totalEvents}
                  </p>
                </div>
              </div>
            </div>

            {/* Período analisado */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                Período Analisado:
              </label>
              <p style={{ fontSize: '16px', marginTop: '4px', color: '#111827' }}>
                {reportDetails.periodSummary}
              </p>
            </div>

            {/* Tabela de ocorrências */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#111827',
                }}
              >
                DETALHAMENTO DAS OCORRÊNCIAS
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th
                      style={{
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        textAlign: 'left',
                        fontWeight: '600',
                      }}
                    >
                      Tipo de Ocorrência
                    </th>
                    <th
                      style={{
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      Quantidade
                    </th>
                    <th
                      style={{
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      Gravidade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performanceSummary.metrics.map(metric => {
                    const total = Object.values(metric.counts).reduce(
                      (sum, count) => sum + count,
                      0
                    );
                    const severity =
                      total === 0 ? 'Baixa' : total <= 2 ? 'Baixa' : total <= 5 ? 'Média' : 'Alta';
                    const severityColor =
                      total === 0
                        ? '#16a34a'
                        : total <= 2
                          ? '#ca8a04'
                          : total <= 5
                            ? '#ea580c'
                            : '#dc2626';

                    return (
                      <tr key={metric.eventType}>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>
                          {metric.eventType}
                        </td>
                        <td
                          style={{
                            border: '1px solid #d1d5db',
                            padding: '8px',
                            textAlign: 'center',
                            fontWeight: '600',
                          }}
                        >
                          {total}
                        </td>
                        <td
                          style={{
                            border: '1px solid #d1d5db',
                            padding: '8px',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: severityColor,
                          }}
                        >
                          {severity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Texto de orientação */}
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#111827',
                }}
              >
                ORIENTAÇÃO REALIZADA
              </h3>
              <div
                style={{
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                }}
              >
                <p style={{ fontSize: '14px', lineHeight: '1.6', margin: '0', color: '#374151' }}>
                  {reportDetails.acknowledgmentText}
                </p>
              </div>
            </div>

            {/* Observações adicionais */}
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#111827',
                }}
              >
                OBSERVAÇÕES ADICIONAIS
              </h3>
              <div
                style={{
                  border: '1px solid #d1d5db',
                  padding: '16px',
                  minHeight: '100px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <p style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic', margin: '0' }}>
                  (Espaço para anotações específicas sobre a orientação realizada)
                </p>
              </div>
            </div>

            {/* Assinaturas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
                marginTop: '48px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{ borderTop: '1px solid #9ca3af', paddingTop: '8px', marginTop: '64px' }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: '0', color: '#111827' }}>
                    COLABORADOR
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '4px',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {driverInfo.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
                    Ciente da orientação recebida
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{ borderTop: '1px solid #9ca3af', paddingTop: '8px', marginTop: '64px' }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: '0', color: '#111827' }}>
                    RESPONSÁVEL RH
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '4px',
                      margin: '4px 0 0 0',
                    }}
                  >
                    Nome: _________________________
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
                    Data: ___/___/______
                  </p>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '32px',
                paddingTop: '16px',
                borderTop: '1px solid #d1d5db',
              }}
            >
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
                Documento gerado automaticamente pelo Sistema de Telemetria Veicular
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Data de geração: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
