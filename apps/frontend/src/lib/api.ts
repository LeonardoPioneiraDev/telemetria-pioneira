// apps/telemetria-web/src/lib/api.ts

import axios from 'axios';

// A URL base da sua API. No futuro, moveremos isso para variáveis de ambiente (.env).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para adicionar o token de autenticação em todas as requisições.
api.interceptors.request.use(
  config => {
    // No navegador, o `window` existe. Verificamos para evitar erros no lado do servidor (SSR).
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);
