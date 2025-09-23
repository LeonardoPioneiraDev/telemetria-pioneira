import { environment } from '@/config/environment.js';
import { ApiCredential } from '@/entities/api-credential.entity.js';
import { ApiCredentialRepository } from '@/repositories/api-credential.repository.js';
import { logger } from '@/shared/utils/logger.js';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import JSONbig from 'json-bigint';

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

export class MixApiClient {
  private api: AxiosInstance;
  private identityApi: AxiosInstance;
  private apiCredentialRepository: ApiCredentialRepository;

  private isRefreshingToken = false;
  private onTokenRefreshed: ((token: string) => void)[] = [];

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

  // --- MÉTODOS PRIVADOS ---

  private async _getAccessToken(): Promise<string | null> {
    try {
      let credentials = await this.apiCredentialRepository.findFirst();
      if (!credentials) {
        credentials = await this._performLogin();
      }
      if (!credentials) return null;

      const now = new Date();
      const expiresAt = new Date(credentials.expires_at);
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        return this._refreshToken();
      }

      return credentials.access_token;
    } catch (error) {
      logger.error(
        'Falha crítica ao obter/gerenciar token de acesso.',
        this._formatAxiosError(error)
      );
      return null;
    }
  }

  private async _refreshToken(): Promise<string | null> {
    logger.info('🔄 Renovando access token...');
    try {
      const credentials = await this.apiCredentialRepository.findFirst();
      if (!credentials?.refresh_token) {
        logger.warn('Refresh token não encontrado. Realizando login completo.');
        const newCredentials = await this._performLogin();
        return newCredentials?.access_token || null;
      }

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', credentials.refresh_token);

      const response = await this.identityApi.post('/token', params, {
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
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', environment.mixApi.username);
      params.append('password', environment.mixApi.password);
      params.append('scope', environment.mixApi.scope);

      const response = await this.identityApi.post('/token', params, {
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
