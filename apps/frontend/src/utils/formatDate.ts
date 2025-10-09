// src/utils/formatDate.ts

import { formatInTimeZone } from 'date-fns-tz';

/**
 * Formata uma data para o fuso horário de São Paulo (Horário de Brasília).
 *
 * @param date A data a ser formatada (pode ser um objeto Date, string ou número).
 * @param formatString O formato desejado (ex: 'dd/MM/yyyy HH:mm:ss'). O padrão é 'dd/MM/yyyy'.
 * @returns A data formatada como string, ou uma string vazia se a data for inválida.
 */
export const formatDateToBrazil = (
  date: string | number | Date,
  formatString: string = 'dd/MM/yyyy'
): string => {
  // O IANA time zone name para o horário de Brasília
  const timeZone = 'America/Sao_Paulo';

  // Retorna string vazia se a data for nula ou indefinida para evitar erros.
  if (!date) {
    return '';
  }

  try {
    // Usa formatInTimeZone para converter e formatar a data para o fuso correto.
    // Ela lida com datas em formato ISO, timestamps ou objetos Date.
    return formatInTimeZone(date, timeZone, formatString);
  } catch (error) {
    console.error('Erro ao formatar a data:', error);
    return 'Data inválida'; // Ou retorne a string vazia: ''
  }
};
