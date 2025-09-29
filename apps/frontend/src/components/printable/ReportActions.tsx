//apps/frontend/src/components/printable/ReportActions.tsx
'use client';
import { LOGO_BASE64 } from '@/assets/images/logoBase64';
import { Button } from '@/components/ui/button';
import { DriverInfo, PerformanceSummary, ReportDetails } from '@/types/api';
import { Download, FileText, Printer } from 'lucide-react';
import { useState } from 'react';

interface ReportActionsProps {
  driverInfo: DriverInfo;
  reportDetails: ReportDetails;
  performanceSummary: PerformanceSummary;
}

export const ReportActions = ({
  driverInfo,
  reportDetails,
  performanceSummary,
}: ReportActionsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Função para encurtar os rótulos das datas
  const formatTableHeader = (label: string) => {
    if (label.includes('a')) {
      return label.replace(
        /(\d{2})\.(\d{2})\.\d{4}\s+a\s+(\d{2})\.(\d{2})\.\d{4}/,
        '$1/$2 - $3/$4'
      );
    }
    return label.replace(/(\d{2})\.(\d{2})\.\d{4}/, '$1/$2');
  };

  const wrapText = (text: string, maxWidth: number, fontSize: number = 10) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Aproximação: cada caractere tem ~0.6 da largura do fontSize
    const charWidth = fontSize * 0.6;
    const maxChars = Math.floor(maxWidth / charWidth);

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Palavra muito longa, quebrar ela mesmo
          lines.push(word.substring(0, maxChars));
          currentLine = word.substring(maxChars);
        }
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };
  // Gerar SVG do gráfico
  // Gerar SVG do gráfico
  // Gerar SVG do gráfico
  const generateChartSVG = () => {
    // FILTRAR PERÍODOS QUE TÊM PELO MENOS UMA OCORRÊNCIA
    const periodsWithData = performanceSummary.periods.filter(period => {
      return performanceSummary.metrics.some(metric => (metric.counts[period.id] ?? 0) > 0);
    });

    // FILTRAR MÉTRICAS QUE TÊM PELO MENOS UMA OCORRÊNCIA
    const metricsWithData = performanceSummary.metrics.filter(metric => {
      return Object.values(metric.counts).some(count => count > 0);
    });

    if (periodsWithData.length === 0 || metricsWithData.length === 0) {
      return '<p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">Nenhuma ocorrência para exibir no gráfico.</p>';
    }

    const width = 900;
    const margin = { top: 50, right: 150, left: 150, bottom: 40 };
    const chartWidth = 500;

    // Calcular altura baseada no número real de barras
    const barHeight = 12;
    const barSpacing = 6;
    const eventSpacing = 15; // Espaço entre grupos de eventos

    // Calcular total de barras que serão exibidas
    let totalBars = 0;
    metricsWithData.forEach(metric => {
      periodsWithData.forEach(period => {
        if ((metric.counts[period.id] ?? 0) > 0) {
          totalBars++;
        }
      });
    });

    const height =
      margin.top +
      margin.bottom +
      totalBars * (barHeight + barSpacing) +
      metricsWithData.length * eventSpacing;
    const chartHeight = height - margin.top - margin.bottom;

    // Encontrar valor máximo para escala X
    const maxValue = Math.max(
      ...metricsWithData.map(metric =>
        Math.max(...periodsWithData.map(period => metric.counts[period.id] ?? 0))
      )
    );
    const xScale = maxValue > 0 ? chartWidth / maxValue : 1;

    // Padrões para diferenciar as datas
    const patterns = [
      'solid',
      'diagonal-lines',
      'dots',
      'horizontal-lines',
      'vertical-lines',
      'cross-hatch',
    ];

    let currentY = margin.top; // Posição Y atual

    let svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Padrões para P&B -->
        <pattern id="diagonal-lines" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#000" stroke-width="0.5"/>
        </pattern>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="1" fill="#000"/>
        </pattern>
        <pattern id="horizontal-lines" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M 0,2 l 4,0" stroke="#000" stroke-width="0.5"/>
        </pattern>
        <pattern id="vertical-lines" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M 2,0 l 0,4" stroke="#000" stroke-width="0.5"/>
        </pattern>
        <pattern id="cross-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#000" stroke-width="0.3"/>
          <path d="M 0,0 l 4,4 M -1,3 l 2,2 M 3,-1 l 2,2" stroke="#000" stroke-width="0.3"/>
        </pattern>
      </defs>
      
      <style>
        .chart-text { font-family: Arial, sans-serif; font-size: 11px; fill: #374151; }
        .chart-title { font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #111827; }
        .axis-line { stroke: #d1d5db; stroke-width: 1; }
        .grid-line { stroke: #f3f4f6; stroke-width: 1; }
        .event-label { font-family: Arial, sans-serif; font-size: 10px; fill: #111827; font-weight: 600; }
        .value-label { font-family: Arial, sans-serif; font-size: 12px; fill: #111827; font-weight: bold; }
        .period-label { font-family: Arial, sans-serif; font-size: 12px; fill: #6b7280; }
      </style>
      
      <!-- Título -->
      <text x="${width / 2}" y="20" text-anchor="middle" class="chart-title">Gráfico de Ocorrências por Evento</text>
      
      <!-- Eixos -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" class="axis-line"/>
      <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" class="axis-line"/>
      
      <!-- Linhas de grade X -->
      ${Array.from({ length: 6 }, (_, i) => {
        const x = margin.left + (chartWidth / 5) * i;
        const value = Math.round((maxValue / 5) * i);
        return `
          <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" class="grid-line"/>
          <text x="${x}" y="${height - margin.bottom + 15}" text-anchor="middle" class="chart-text">${value}</text>
        `;
      }).join('')}
  `;

    // Gerar grupos de eventos
    metricsWithData.forEach((metric, eventIndex) => {
      // Label do evento (posicionado no meio do grupo)
      const eventStartY = currentY;

      // Contar quantas barras este evento terá
      const eventBarsCount = periodsWithData.filter(
        period => (metric.counts[period.id] ?? 0) > 0
      ).length;
      const eventGroupHeight = eventBarsCount * (barHeight + barSpacing);

      // QUEBRA AUTOMÁTICA DO TEXTO
      const maxLabelWidth = margin.left - 20; // Largura disponível para o texto
      const textLines = wrapText(metric.eventType, maxLabelWidth, 10);
      const lineHeight = 12;
      const totalTextHeight = textLines.length * lineHeight;

      // Centralizar o texto verticalmente no grupo
      const textStartY = eventStartY + (eventGroupHeight - totalTextHeight) / 2 + lineHeight;

      // Gerar múltiplas linhas de texto
      textLines.forEach((line, lineIndex) => {
        const lineY = textStartY + lineIndex * lineHeight;
        svgContent += `
      <!-- Label do evento (linha ${lineIndex + 1}) -->
      <text x="${margin.left - 10}" y="${lineY}" text-anchor="end" class="event-label">
        ${line}
      </text>
    `;
      });

      // Gerar barras para cada período deste evento
      periodsWithData.forEach((period, periodIndex) => {
        const value = metric.counts[period.id] ?? 0;
        if (value === 0) return;

        const barWidth = value * xScale;
        const barY = currentY;
        const barX = margin.left;

        // Determinar padrão baseado no período
        const pattern = patterns[periodIndex % patterns.length];
        const fill = pattern === 'solid' ? '#666666' : `url(#${pattern})`;

        svgContent += `
        <!-- Barra -->
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" 
              fill="${fill}" stroke="#333" stroke-width="0.5"/>
        
        <!-- Valor (direita da barra) -->
        <text x="${barX + barWidth + 5}" y="${barY + barHeight / 2 + 3}" text-anchor="start" class="value-label">
          ${value}
        </text>
        
        <!-- Data do período (ao lado do valor) -->
        <text x="${barX + barWidth + 25}" y="${barY + barHeight / 2 + 3}" text-anchor="start" class="period-label">
          (${formatTableHeader(period.label)})
        </text>
      `;

        currentY += barHeight + barSpacing;
      });

      // Adicionar espaço entre grupos de eventos
      currentY += eventSpacing;
    });

    // Adicionar legenda
    svgContent += `
    <!-- Legenda de padrões -->
    <text x="${width - margin.right + 10}" y="${margin.top + 10}" class="chart-text" font-weight="bold">Períodos:</text>
    ${periodsWithData
      .map((period, index) => {
        const legendY = margin.top + 30 + index * 20;
        const legendX = width - margin.right + 10;
        const pattern = patterns[index % patterns.length];
        const fill = pattern === 'solid' ? '#666666' : `url(#${pattern})`;

        return `
          <rect x="${legendX}" y="${legendY - 8}" width="15" height="12" fill="${fill}" stroke="#333" stroke-width="0.5"/>
          <text x="${legendX + 20}" y="${legendY}" class="chart-text" font-size="9">
            ${formatTableHeader(period.label)}
          </text>
        `;
      })
      .join('')}
    
    </svg>
  `;

    return svgContent;
  };

  // Gerar HTML do formulário
  const generateFormHTML = () => {
    const totalEvents = performanceSummary.metrics.reduce((total, metric) => {
      return total + Object.values(metric.counts).reduce((sum, count) => sum + count, 0);
    }, 0);

    // FILTRAR PERÍODOS QUE TÊM PELO MENOS UMA OCORRÊNCIA
    const periodsWithData = performanceSummary.periods.filter(period => {
      return performanceSummary.metrics.some(metric => (metric.counts[period.id] ?? 0) > 0);
    });

    // FILTRAR MÉTRICAS QUE TÊM PELO MENOS UMA OCORRÊNCIA
    const metricsWithData = performanceSummary.metrics.filter(metric => {
      return Object.values(metric.counts).some(count => count > 0);
    });

    const chartSVG = generateChartSVG();

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Formulário de Orientação - ${driverInfo.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #111827;
            line-height: 1.4;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 5px;
          }
          .header {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            margin-bottom: 40px;
            }
          .header-image {
            height: 80px; 
            margin-right: 10px;
            background-color: #111111;
            border-radius: 50%;
          }
          .header-content {
            text-align: center;
          }
          .header h1 {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #111827;
          }
          .header h2 {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }
          .header p {
            font-size: 12px;
            color: #6b7280;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 20px;
            margin-top: 20px;
          }
          .field {
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .field label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            display: block;
          }
          .field p {
            font-size: 16px;
            font-weight: 500;
            color: #111827;
            margin: 3px 0 0 0;
          }
          .field.total p {
            color: #dc2626;
          }
          .section {
            margin-bottom: 35px;
          }
          .section h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #111827;
          }
          
          /* Tabela de métricas */
          .metrics-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .metrics-table th, .metrics-table td {
            border: 1px solid #d1d5db;
            padding: 6px 4px;
            font-size: 14px;
            text-align: center;
          }
          .metrics-table th {
            background-color: #f3f4f6;
            font-weight: 600;
            font-size: 14px;
          }
          .metrics-table th:first-child, .metrics-table td:first-child {
            text-align: left;
            width: 35%;
            font-size: 14px;
          }
          .metrics-table td {
            font-weight: 600;
          }
          .metrics-table .total-col {
            background-color: #fef3c7;
            font-weight: bold;
          }
          
          /* Gráfico */
          .chart-container {
            text-align: center;
            margin: 20px 0;
            page-break-inside: avoid;
          }
          
          /* Tabela de ocorrências resumida */
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
          }
          .summary-table th, .summary-table td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
          }
          .summary-table th {
            background-color: #f3f4f6;
            font-weight: 600;
            text-align: center;
          }
          .summary-table td.center {
            text-align: center;
            font-weight: 600;
          }
          .severity-low { color: #16a34a; }
          .severity-medium { color: #ca8a04; }
          .severity-high { color: #dc2626; }
          
          .text-box {
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            font-size: 12px;
            line-height: 1.5;
          }
          .observations {
            border: 1px solid #d1d5db;
            padding: 12px;
            min-height: 80px;
            background-color: #f9fafb;
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 30px;
          }
          .signature {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #9ca3af;
            padding-top: 6px;
            margin-top: 40px;
          }
          .signature-line p {
            margin: 3px 0;
          }
          .signature-title {
            font-size: 12px;
            font-weight: 600;
            color: #111827;
          }
          .signature-info {
            font-size: 10px;
            color: #6b7280;
          }
          .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 12px;
            border-top: 1px solid #d1d5db;
            font-size: 10px;
            color: #6b7280;
          }
            
          
          @media print {
            body { margin: 0; padding: 0; }
            .container { padding: 15px; }
            @page { margin: 1cm; size: A4; }
            .chart-container { page-break-inside: avoid; }
            .metrics-table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
           <div>
            <img src="${LOGO_BASE64}" class="header-image" alt="Logo da Empresa"/>
           </div>
            <div class="header-content">
              <h1>FORMULÁRIO DE ORIENTAÇÃO</h1>
              <h2>VIAÇÃO PIONEIRA - SISTEMA DE TELEMETRIA VEICULAR</h2>
              <p>Controle de Desempenho e Segurança na Condução</p>
            </div>
          </div>
          <div class="grid-2">
            <div>
              <div class="field">
                <label>Nome do Colaborador:</label>
                <p>${driverInfo.name}</p>
              </div>
              <div class="field">
                <label>Número do Crachá:</label>
                <p>${driverInfo.badge || 'N/A'}</p>
              </div>
            </div>
            <div>
              <div class="field">
                <label>Data da Orientação:</label>
                <p>${reportDetails.reportDateFormatted}</p>
              </div>
              <div class="field total">
                <label>Total de Ocorrências:</label>
                <p>${totalEvents}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <label>Período Analisado:</label>
            <p style="margin-top: 4px; font-size: 14px;">${reportDetails.periodSummary}</p>
          </div>

          <!-- TABELA DETALHADA DE MÉTRICAS - APENAS COLUNAS COM DADOS -->
          <div class="section">
            <h3>MÉTRICAS DE DESEMPENHO POR PERÍODO</h3>
            ${
              periodsWithData.length > 0
                ? `
              <table class="metrics-table">
                <thead>
                  <tr>
                    <th>Ocorrência: Motorista</th>
                    ${periodsWithData
                      .map(
                        period => `
                      <th>${formatTableHeader(period.label)}</th>
                    `
                      )
                      .join('')}
                    <th class="total-col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${metricsWithData
                    .map(metric => {
                      const total = performanceSummary.periods.reduce(
                        (sum, period) => sum + (metric.counts[period.id] ?? 0),
                        0
                      );

                      return `
                      <tr>
                        <td>${metric.eventType}</td>
                        ${periodsWithData
                          .map(
                            period => `
                          <td>${metric.counts[period.id] ?? 0}</td>
                        `
                          )
                          .join('')}
                        <td class="total-col">${total}</td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
                : `
              <p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">
                Nenhuma ocorrência registrada no período analisado.
              </p>
            `
            }
          </div>

          <!-- GRÁFICO -->
          ${
            periodsWithData.length > 0
              ? `
            <div class="section">
              <div class="chart-container">
                ${chartSVG}
              </div>
            </div>
          `
              : ''
          }
          <div class="section">
            <h3>ORIENTAÇÃO REALIZADA</h3>
            <div class="text-box">
              ${reportDetails.acknowledgmentText}
            </div>
          </div>
          <div class="signatures">
            <div class="signature">
              <div class="signature-line">
                <p class="signature-title">COLABORADOR</p>
                <p class="signature-info">${driverInfo.name}</p>
                <p class="signature-info">Ciente da orientação recebida</p>
              </div>
            </div>
            <div class="signature">
              <div class="signature-line">
                <p class="signature-title">RESPONSÁVEL RH</p>
                <p class="signature-info">Nome: _________________________</p>
                <p class="signature-info">Data: ___/___/______</p>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Documento gerado automaticamente pelo Sistema de Telemetria Veicular</p>
            <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintForm = () => {
    const formHTML = generateFormHTML();
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(formHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    }
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');

      const formHTML = generateFormHTML();

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formHTML;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '800px';
      tempDiv.style.background = 'white';

      document.body.appendChild(tempDiv);

      // Aguardar um pouco para o SVG renderizar
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas.default(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: tempDiv.scrollHeight,
        width: 800,
      });

      document.body.removeChild(tempDiv);

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
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Use a opção de impressão.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewForm = () => {
    const formHTML = generateFormHTML();
    const newWindow = window.open('', '_blank');

    if (newWindow) {
      newWindow.document.write(formHTML);
      newWindow.document.close();
    }
  };

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-green-100 rounded-lg border items-center">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base text-green-900 mb-1">Formulário de Orientação</h3>
        <p className="text-xs text-green-800 ">
          Documento oficial com tabela detalhada e gráfico para arquivo do RH
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleViewForm} variant="default" size="sm" className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          Visualizar
        </Button>

        <Button onClick={handlePrintForm} variant="outline" size="sm" className="cursor-pointer">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>

        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          size="sm"
          disabled={isGenerating}
          className="cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4" />
          {isGenerating ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>
    </div>
  );
};
