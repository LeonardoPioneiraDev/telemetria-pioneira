import { environment } from '@/config/environment.js';
import { ApiCredential } from '@/entities/api-credential.entity.js';
import { ApiCredentialRepository } from '@/repositories/api-credential.repository.js';
import { logger } from '@/shared/utils/logger.js';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import JSONbig from 'json-bigint';
import qs from 'qs';

// Tipos de dados
type MixDriver = {
  DriverId: number;
  Name: string;
  EmployeeNumber: string;
  IsSystemDriver: boolean;
};
type MixVehicle = {
  AssetId: number;
  Description: string;
  RegistrationNumber: string;
  FleetNumber: string;
  Make: string;
  Model: string;
  Year: string;
};
type MixEventType = {
  EventTypeId: number;
  Description: string;
  EventType: string;
  DisplayUnits: string | null;
};

export interface EventsSinceResponse {
  events: MixEvent[];
  hasMoreItems: boolean;
  nextSinceToken: string;
}

// Adicione esta interface também (se ainda não existir)
export interface MixEvent {
  EventId: string;
  DriverId?: string;
  AssetId?: string;
  EventTypeId?: string;
  StartDateTime: Date;
  StartPosition?: {
    Latitude: number;
    Longitude: number;
    SpeedKilometresPerHour?: number;
    FormattedAddress?: string;
  };
  Value?: number;
  SpeedLimitKilometresPerHour?: number;
  [key: string]: any;
}

export class MixApiClient {
  private api: AxiosInstance;
  private identityApi: AxiosInstance;
  private apiCredentialRepository: ApiCredentialRepository;

  private isRefreshingToken = false;
  private onTokenRefreshed: ((token: string) => void)[] = [];

  private cachedToken: string | null = null;
  private tokenCacheExpiry: number = 0;

  constructor() {
    this.apiCredentialRepository = new ApiCredentialRepository();

    // VERSÃO CORRIGIDA: Apenas uma criação do this.api
    this.api = axios.create({
      baseURL: 'https://integrate.us.mixtelematics.com/api',
      transformResponse: [
        data => {
          if (typeof data !== 'string') {
            return data;
          }
          try {
            // Apenas a lógica do JSONbig, que preserva números grandes
            return JSONbig({ storeAsString: true }).parse(data);
          } catch (e) {
            // Se o parse falhar, retorna o dado original
            return data;
          }
        },
      ],
    });

    this.identityApi = axios.create({
      baseURL: 'https://identity.us.mixtelematics.com/core/connect',
    });

    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (!this.isRefreshingToken) {
            this.isRefreshingToken = true;
            try {
              const newAccessToken = await this._refreshToken();
              this.onTokenRefreshed.forEach(cb => cb(newAccessToken!));
              this.onTokenRefreshed = [];
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return this.api(originalRequest);
            } catch (refreshError) {
              return Promise.reject(refreshError);
            } finally {
              this.isRefreshingToken = false;
            }
          } else {
            return new Promise(resolve => {
              this.onTokenRefreshed.push(token => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                resolve(this.api(originalRequest));
              });
            });
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // --- MÉTODOS PÚBLICOS ---

  public async getAllDrivers(): Promise<MixDriver[] | null> {
    try {
      const token = await this._getAccessToken();
      if (!token)
        throw new Error('Não foi possível obter o token de acesso para buscar motoristas.');

      const response = await this.api.get('/drivers/organisation/1662701282895036416', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error('Erro ao buscar motoristas:', this._formatAxiosError(error));
      return null;
    }
  }

  public async getAllVehicles(): Promise<MixVehicle[] | null> {
    try {
      const token = await this._getAccessToken();
      if (!token) throw new Error('Não foi possível obter o token de acesso para buscar veículos.');

      const response = await this.api.get('/assets/group/1662701282895036416', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error('Erro ao buscar veículos:', this._formatAxiosError(error));
      return null;
    }
  }

  public async getAllEventTypes(): Promise<MixEventType[] | null> {
    try {
      const token = await this._getAccessToken();
      if (!token)
        throw new Error('Não foi possível obter o token de acesso para buscar tipos de evento.');

      const response = await this.api.get('/libraryevents/organisation/1662701282895036416', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error('Erro ao buscar tipos de evento:', this._formatAxiosError(error));
      return null;
    }
  }
  public async getEventsSince(sinceToken: string): Promise<EventsSinceResponse | null> {
    const startTime = Date.now();

    try {
      const token = await this._getAccessToken();
      if (!token) throw new Error('Não foi possível obter o token de acesso para buscar eventos.');

      const url = `/events/groups/createdsince/organisation/1662701282895036416/sincetoken/${sinceToken}/quantity/1000`;

      // Usa o método retryable para chamadas com retry automático
      const response = await this._retryableRequest(
        () =>
          this.api.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: environment.api.timeout,
          }),
        'getEventsSince'
      );

      const duration = Date.now() - startTime;
      const eventsCount = Array.isArray(response.data) ? response.data.length : 0;

      logger.info(`✅ Eventos buscados com sucesso`, {
        sinceToken,
        eventsCount,
        duration: `${duration}ms`,
        hasMoreItems: response.headers['hasmoreitems'],
        nextToken: response.headers['getsincetoken']?.substring(0, 20) + '...',
      });

      // Log de warning se a requisição demorar muito
      if (duration > 10000) {
        logger.warn(`⚠️ Requisição lenta detectada (${duration}ms)`, {
          sinceToken,
          url,
        });
      }

      return {
        events: response.data,
        hasMoreItems: response.headers['hasmoreitems'] === 'True',
        nextSinceToken: response.headers['getsincetoken'],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Erro ao buscar eventos com sinceToken ${sinceToken}:`, {
        error: this._formatAxiosError(error),
        duration: `${duration}ms`,
      });
      return null;
    }
  }

  /**
   * Busca eventos históricos por intervalo de tempo
   * @param fromDate Data inicial no formato yyyyMMddhhmmss
   * @param toDate Data final no formato yyyyMMddhhmmss
   */
  public async getHistoricalEvents(fromDate: string, toDate: string): Promise<MixEvent[] | null> {
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const token = await this._getAccessToken();
        if (!token) {
          throw new Error('Não foi possível obter o token de acesso.');
        }

        const url = `/events/groups/entitytype/Asset/from/${fromDate}/to/${toDate}`;

        // const response = await this.api.post(
        //   url,
        //   {
        //     EntityIds: [1662701282895036400],
        //   },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${token}`,
        //       'Content-Type': 'application/json',
        //     },
        //     timeout: environment.api.timeout,
        //   }
        // );
        const body = {
          EntityIds: [1662701282895036400], // <-- Usando o ID que funciona no Postman
        };

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json', // Boa prática
          },
          timeout: environment.api.timeout,
        };

        // --- ETAPA 2: ADICIONAR O LOG ANTES DA CHAMADA ---
        logger.debug('AXIOS REQUEST CONFIG:', {
          url,
          method: 'post',
          data: body,
          headers: config.headers,
        });

        // --- ETAPA 3: FAZER A CHAMADA USANDO AS VARIÁVEIS ---
        const response = await this.api.post(url, body, config);

        const duration = Date.now() - startTime;
        const eventsCount = Array.isArray(response.data) ? response.data.length : 0;

        logger.info(`✅ Eventos históricos buscados com sucesso`, {
          fromDate,
          toDate,
          eventsCount,
          duration: `${duration}ms`,
        });

        return response.data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401 && retries < maxRetries) {
          logger.warn(
            `⚠️ 401 recebido, tentativa ${retries + 1}/${maxRetries}. Limpando cache de token...`
          );

          this.cachedToken = null;
          this.tokenCacheExpiry = 0;

          retries++;
          await this._sleep(2000); // Aguarda 2s antes de retry
          continue;
        }

        // Outros erros
        const duration = Date.now() - startTime;
        logger.error(`Erro ao buscar eventos históricos (${fromDate} → ${toDate}):`, {
          error: this._formatAxiosError(error),
          duration: `${duration}ms`,
        });
        return null;
      }
    }

    return null;
  }

  // --- MÉTODOS PRIVADOS ---

  /**
   * Executa uma requisição com retry automático e tratamento de erros específicos
   */
  private async _retryableRequest<T = any>(
    requestFn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= environment.api.retryAttempts; attempt++) {
      try {
        const result = await requestFn();

        // Sucesso - reseta o contador de erros do interceptor se necessário
        if (attempt > 1) {
          logger.info(`✅ ${operationName}: sucesso na tentativa ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Verifica se é um erro que não devemos fazer retry
        if (isAxiosError(error)) {
          const status = error.response?.status;

          // Erros 4xx (exceto 429) não devem fazer retry
          if (status && status >= 400 && status < 500 && status !== 429) {
            logger.error(`❌ ${operationName}: erro ${status} (sem retry)`, {
              status,
              statusText: error.response?.statusText,
              attempt,
            });
            throw error;
          }

          // 429 (Rate Limit) - aguarda mais tempo
          if (status === 429) {
            const retryAfter = error.response?.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

            logger.warn(`⚠️ Rate limit atingido (429). Aguardando ${waitTime}ms...`, {
              operationName,
              attempt,
            });

            await this._sleep(waitTime);
            continue;
          }
        }

        // Se não for a última tentativa, aguarda com backoff exponencial
        if (attempt < environment.api.retryAttempts) {
          const delay = environment.api.retryDelay * Math.pow(2, attempt - 1);
          const maxDelay = 30000;
          const finalDelay = Math.min(delay, maxDelay);

          logger.warn(
            `⚠️ ${operationName}: falhou na tentativa ${attempt}. Retry em ${finalDelay}ms...`,
            {
              error: error instanceof Error ? error.message : String(error),
              nextAttempt: attempt + 1,
            }
          );

          await this._sleep(finalDelay);
        } else {
          // Última tentativa falhou
          logger.error(`❌ ${operationName}: falhou após ${attempt} tentativas`, {
            error: this._formatAxiosError(error),
          });
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
  }

  /**
   * Helper para sleep
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async _getAccessToken(): Promise<string | null> {
    try {
      const now = Date.now();
      if (this.cachedToken && now < this.tokenCacheExpiry) {
        return this.cachedToken;
      }

      let credentials = await this.apiCredentialRepository.findFirst();
      if (!credentials) {
        credentials = await this._performLogin();
      }
      if (!credentials) return null;

      const expiresAt = new Date(credentials.expires_at);
      const timeToExpiry = expiresAt.getTime() - now;

      // Se faltam menos de 5 minutos, renova
      if (timeToExpiry < 5 * 60 * 1000) {
        const newToken = await this._refreshToken();
        if (newToken) {
          this.cachedToken = newToken;
          this.tokenCacheExpiry = now + 4 * 60 * 1000;
        }
        return newToken;
      }

      this.cachedToken = credentials.access_token;
      this.tokenCacheExpiry = expiresAt.getTime() - 60 * 1000; // 1 min antes de expirar

      return credentials.access_token;
    } catch (error) {
      logger.error(
        'Falha crítica ao obter/gerenciar token de acesso.',
        this._formatAxiosError(error)
      );
      return null;
    }
  }

  // private async _refreshToken(): Promise<string | null> {
  //   logger.info('🔄 Renovando access token...');
  //   try {
  //     const credentials = await this.apiCredentialRepository.findFirst();
  //     if (!credentials?.refresh_token) {
  //       logger.warn('Refresh token não encontrado. Realizando login completo.');
  //       const newCredentials = await this._performLogin();
  //       return newCredentials?.access_token || null;
  //     }

  //     const params = new URLSearchParams();
  //     params.append('grant_type', 'refresh_token');
  //     params.append('refresh_token', credentials.refresh_token);

  //     const response = await this.identityApi.post('/token', params, {
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //         Authorization: `Basic ${environment.mixApi.basicAuthToken}`,
  //       },
  //     });

  //     const { access_token, refresh_token, expires_in } = response.data;
  //     const expires_at = new Date(new Date().getTime() + expires_in * 1000);

  //     await this.apiCredentialRepository.upsertCredentials({
  //       id: credentials.id,
  //       access_token,
  //       refresh_token,
  //       expires_at,
  //     });
  //     logger.info('✅ Access token renovado com sucesso.');

  //     return access_token;
  //   } catch (error) {
  //     logger.error('❌ FALHA AO RENOVAR TOKEN:', this._formatAxiosError(error));
  //     // Se a renovação falhar, tenta um login completo como último recurso
  //     const newCredentials = await this._performLogin();
  //     return newCredentials?.access_token || null;
  //   }
  // }

  private async _refreshToken(): Promise<string | null> {
    logger.info('🔄 Renovando access token...');
    try {
      const credentials = await this.apiCredentialRepository.findFirst();
      if (!credentials?.refresh_token) {
        logger.warn('Refresh token não encontrado. Realizando login completo.');
        return this._performLogin().then(newCreds => newCreds?.access_token || null);
      }

      // 1. Define os dados da renovação
      const refreshData = {
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
      };

      // 2. Usa a biblioteca 'qs' para formatar, replicando o Postman
      const requestBody = qs.stringify(refreshData);
      const queryString = qs.stringify(refreshData);

      // 3. Monta a URL com a query string
      const urlComParametros = `/token?${queryString}`;

      // 4. Envia a requisição com os dados na URL e no Body
      const response = await this.identityApi.post(urlComParametros, requestBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${environment.mixApi.basicAuthToken}`,
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const expires_at = new Date(new Date().getTime() + expires_in * 1000);

      await this.apiCredentialRepository.upsertCredentials({
        id: credentials.id,
        access_token,
        refresh_token,
        expires_at,
      });
      logger.info('✅ Access token renovado com sucesso.');

      return access_token;
    } catch (error) {
      logger.error('❌ FALHA AO RENOVAR TOKEN:', this._formatAxiosError(error));
      // Se a renovação falhar, tenta um login completo como último recurso
      const newCredentials = await this._performLogin();
      return newCredentials?.access_token || null;
    }
  }

  private async _performLogin(): Promise<ApiCredential | null> {
    logger.info('🔑 Realizando login inicial na API MiX...');
    try {
      // 1.  dados do login em um objeto simples
      const loginData = {
        grant_type: 'password',
        username: environment.mixApi.username,
        password: environment.mixApi.password,
        scope: environment.mixApi.scope,
      };

      // 2. biblioteca 'qs' para formatar os dados, exatamente como o Postman
      const requestBody = qs.stringify(loginData);
      const queryString = qs.stringify(loginData);

      // 3.  URL com a query string
      const urlComParametros = `/token?${queryString}`;

      // 4. Envia a requisição com os dados na URL e no Body
      const response = await this.identityApi.post(urlComParametros, requestBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${environment.mixApi.basicAuthToken}`,
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const expires_at = new Date(new Date().getTime() + expires_in * 1000);

      const newCredentials = await this.apiCredentialRepository.upsertCredentials({
        access_token,
        refresh_token,
        expires_at,
      });
      logger.info('✅ Login inicial realizado e credenciais salvas.');

      return newCredentials;
    } catch (error) {
      logger.error('❌ FALHA NO LOGIN:', this._formatAxiosError(error));
      return null;
    }
  }

  private _formatAxiosError(error: any): object {
    if (isAxiosError(error)) {
      return {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
      };
    }
    return { message: error.message };
  }
}
