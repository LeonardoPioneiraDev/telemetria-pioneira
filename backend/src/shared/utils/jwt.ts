import jwt from 'jsonwebtoken';
import { environment } from '../../config/environment.js';
import { logger, securityLogger } from './logger.js';

export interface JWTPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  email: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export class JWTService {
  private static instance: JWTService;

  private constructor() {}

  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  /**
   * Gerar token de acesso
   */
  public generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const token = jwt.sign(
        payload,
        environment.jwt.secret,
        {
          expiresIn: environment.jwt.expiresIn,
          issuer: 'telemetria-pioneira',
          audience: 'telemetria-users'
        }
      );

      securityLogger.info('Token de acesso gerado', {
        userId: payload.id,
        email: payload.email,
        role: payload.role
      });

      return token;
    } catch (error) {
      securityLogger.error('Erro ao gerar token de acesso:', error);
      throw new Error('Falha na geração do token de acesso');
    }
  }

  /**
   * Gerar token de refresh
   */
  public generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    try {
      const token = jwt.sign(
        payload,
        environment.jwt.refreshSecret,
        {
          expiresIn: environment.jwt.refreshExpiresIn,
          issuer: 'telemetria-pioneira',
          audience: 'telemetria-refresh'
        }
      );

      securityLogger.info('Token de refresh gerado', {
        userId: payload.id,
        email: payload.email,
        tokenVersion: payload.tokenVersion
      });

      return token;
    } catch (error) {
      securityLogger.error('Erro ao gerar token de refresh:', error);
      throw new Error('Falha na geração do token de refresh');
    }
  }

  /**
   * Verificar e decodificar token de acesso
   */
  public verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(
        token,
        environment.jwt.secret,
        {
          issuer: 'telemetria-pioneira',
          audience: 'telemetria-users'
        }
      ) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        securityLogger.warn('Token de acesso expirado', { token: token.substring(0, 20) + '...' });
        throw new Error('Token expirado');
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        securityLogger.warn('Token de acesso inválido', { 
          error: error.message,
          token: token.substring(0, 20) + '...'
        });
        throw new Error('Token inválido');
      }

      securityLogger.error('Erro na verificação do token de acesso:', error);
      throw new Error('Falha na verificação do token');
    }
  }

  /**
   * Verificar e decodificar token de refresh
   */
  public verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(
        token,
        environment.jwt.refreshSecret,
        {
          issuer: 'telemetria-pioneira',
          audience: 'telemetria-refresh'
        }
      ) as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        securityLogger.warn('Token de refresh expirado', { token: token.substring(0, 20) + '...' });
        throw new Error('Token de refresh expirado');
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        securityLogger.warn('Token de refresh inválido', { 
          error: error.message,
          token: token.substring(0, 20) + '...'
        });
        throw new Error('Token de refresh inválido');
      }

      securityLogger.error('Erro na verificação do token de refresh:', error);
      throw new Error('Falha na verificação do token de refresh');
    }
  }

  /**
   * Decodificar token sem verificar (para debug)
   */
  public decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Erro ao decodificar token:', error);
      return null;
    }
  }

  /**
   * Verificar se token está expirado sem lançar exceção
   */
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Obter tempo restante do token em segundos
   */
  public getTokenTimeRemaining(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const timeRemaining = decoded.exp - currentTime;
      
      return Math.max(0, timeRemaining);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Gerar par de tokens (acesso + refresh)
   */
  public generateTokenPair(user: {
    id: string;
    email: string;
    username: string;
    role: string;
    permissions: string[];
    tokenVersion: number;
  }): {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  } {
    const accessToken = this.generateAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    });

    const refreshToken = this.generateRefreshToken({
      id: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: environment.jwt.expiresIn
    };
  }
}

export const jwtService = JWTService.getInstance();
export default jwtService;