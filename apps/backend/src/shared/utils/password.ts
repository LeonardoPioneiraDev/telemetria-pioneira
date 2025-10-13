import bcrypt from 'bcryptjs';
import { environment } from '../../config/environment.js';
import { logger, securityLogger } from './logger.js';
import { randomBytes, createHash } from 'crypto';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

export class PasswordService {
  private static instance: PasswordService;

  private constructor() {}

  public static getInstance(): PasswordService {
    if (!PasswordService.instance) {
      PasswordService.instance = new PasswordService();
    }
    return PasswordService.instance;
  }

  /**
   * Hash da senha usando bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = environment.auth.bcryptRounds;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      securityLogger.info('Senha hasheada com sucesso');
      
      return hashedPassword;
    } catch (error) {
      securityLogger.error('Erro ao fazer hash da senha:', error);
      throw new Error('Falha no processamento da senha');
    }
  }

  /**
   * Verificar senha
   */
  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      
      if (isValid) {
        securityLogger.info('Senha verificada com sucesso');
      } else {
        securityLogger.warn('Tentativa de login com senha incorreta');
      }
      
      return isValid;
    } catch (error) {
      securityLogger.error('Erro na verificação da senha:', error);
      throw new Error('Falha na verificação da senha');
    }
  }

  /**
   * Validar força da senha
   */
  public validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Verificar comprimento mínimo
    if (password.length < environment.auth.password.minLength) {
      errors.push(`A senha deve ter pelo menos ${environment.auth.password.minLength} caracteres`);
    } else {
      score += 1;
    }

    // Verificar maiúsculas
    if (environment.auth.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula');
    } else if (/[A-Z]/.test(password)) {
      score += 1;
    }

    // Verificar minúsculas
    if (environment.auth.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula');
    } else if (/[a-z]/.test(password)) {
      score += 1;
    }

    // Verificar números
    if (environment.auth.password.requireNumbers && !/\d/.test(password)) {
      errors.push('A senha deve conter pelo menos um número');
    } else if (/\d/.test(password)) {
      score += 1;
    }

    // Verificar símbolos
    if (environment.auth.password.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password)) {
      errors.push('A senha deve conter pelo menos um símbolo especial');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password)) {
      score += 1;
    }

    // Verificações adicionais para força
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z].*[A-Z]/.test(password)) score += 0.5;
    if (/[a-z].*[a-z]/.test(password)) score += 0.5;
    if (/\d.*\d/.test(password)) score += 0.5;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password)) score += 0.5;

    // Verificar padrões comuns fracos
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('A senha contém padrões comuns que são facilmente descobertos');
        score -= 2;
        break;
      }
    }

    // Verificar sequências (permitir até 3 caracteres consecutivos)
    if (/(.)\1{3,}/.test(password)) {
      errors.push('A senha não deve conter mais de 3 caracteres repetidos em sequência');
      score -= 1;
    }

    // Determinar força
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (score < 2) {
      strength = 'weak';
    } else if (score < 4) {
      strength = 'medium';
    } else if (score < 6) {
      strength = 'strong';
    } else {
      strength = 'very-strong';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, score)
    };
  }

  /**
   * Gerar senha aleatória segura
   */
  public generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    let charset = '';

    // Garantir pelo menos um caractere de cada tipo obrigatório
    if (environment.auth.password.requireUppercase) {
      password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      charset += uppercase;
    }

    if (environment.auth.password.requireLowercase) {
      password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      charset += lowercase;
    }

    if (environment.auth.password.requireNumbers) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
      charset += numbers;
    }

    if (environment.auth.password.requireSymbols) {
      password += symbols.charAt(Math.floor(Math.random() * symbols.length));
      charset += symbols;
    }

    // Preencher o restante
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Embaralhar a senha
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Gerar token de reset de senha
   */
  public generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Gerar hash do token de reset
   */
  public hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verificar se a nova senha é diferente da atual
   */
  public async isPasswordDifferent(newPassword: string, currentHashedPassword: string): Promise<boolean> {
    try {
      const isSame = await bcrypt.compare(newPassword, currentHashedPassword);
      return !isSame;
    } catch (error) {
      logger.error('Erro ao comparar senhas:', error);
      return true; // Em caso de erro, assumir que são diferentes
    }
  }

  /**
   * Gerar hash para verificação de integridade
   */
  public generateIntegrityHash(data: string): string {
    return createHash('sha256').update(data + environment.jwt.secret).digest('hex');
  }

  /**
   * Verificar hash de integridade
   */
  public verifyIntegrityHash(data: string, hash: string): boolean {
    const expectedHash = this.generateIntegrityHash(data);
    return expectedHash === hash;
  }
}

export const passwordService = PasswordService.getInstance();
export default passwordService;