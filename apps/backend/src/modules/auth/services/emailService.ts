import { emailService as emailConfig } from '../../../config/email.js';
import { logger, emailLogger } from '../../../shared/utils/logger.js';
import { environment } from '../../../config/environment.js';

export interface WelcomeEmailData {
  name: string;
  username: string;
  loginUrl?: string;
}

export interface PasswordResetEmailData {
  name: string;
  resetToken: string;
  resetUrl?: string;
  expiresIn?: string;
}

export interface PasswordChangedEmailData {
  name: string;
  changeDate?: string;
  ipAddress?: string;
}

export interface EmailVerificationData {
  name: string;
  verificationToken: string;
  verificationUrl?: string;
  expiresIn?: string;
}

export interface AccountStatusEmailData {
  name: string;
  status: 'activated' | 'suspended';
  reason?: string;
  contactEmail?: string;
}

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Enviar email de boas-vindas
   */
  public async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Email de boas-vindas não enviado - serviço desabilitado', { to });
        return false;
      }

      emailLogger.info('Enviando email de boas-vindas', { to, username: data.username });

      const success = await emailConfig.sendWelcomeEmail(to, {
        name: data.name,
        username: data.username,
        loginUrl: data.loginUrl || `${environment.frontend.url}/login`
      });

      if (success) {
        emailLogger.info('Email de boas-vindas enviado com sucesso', { to });
      } else {
        emailLogger.error('Falha ao enviar email de boas-vindas', { to });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar email de boas-vindas:', { error, to });
      throw error;
    }
  }

  /**
   * Enviar email de recuperação de senha
   */
  public async sendPasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Email de reset não enviado - serviço desabilitado', { to });
        return false;
      }

      emailLogger.info('Enviando email de recuperação de senha', { to });

      const success = await emailConfig.sendPasswordResetEmail(to, {
        name: data.name,
        resetToken: data.resetToken,
        resetUrl: data.resetUrl || `${environment.frontend.url}/reset-password?token=${data.resetToken}`,
        expiresIn: data.expiresIn || '1 hora'
      });

      if (success) {
        emailLogger.info('Email de recuperação de senha enviado com sucesso', { to });
      } else {
        emailLogger.error('Falha ao enviar email de recuperação de senha', { to });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar email de recuperação de senha:', { error, to });
      throw error;
    }
  }

  /**
   * Enviar email de confirmação de alteração de senha
   */
  public async sendPasswordChangedEmail(to: string, data: PasswordChangedEmailData): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Email de confirmação não enviado - serviço desabilitado', { to });
        return false;
      }

      emailLogger.info('Enviando email de confirmação de alteração de senha', { to });

      const success = await emailConfig.sendPasswordChangedEmail(to, {
        name: data.name,
        changeDate: data.changeDate || new Date().toLocaleString('pt-BR'),
        ipAddress: data.ipAddress || 'Não disponível'
      });

      if (success) {
        emailLogger.info('Email de confirmação de alteração de senha enviado com sucesso', { to });
      } else {
        emailLogger.error('Falha ao enviar email de confirmação de alteração de senha', { to });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar email de confirmação de alteração de senha:', { error, to });
      throw error;
    }
  }

  /**
   * Enviar email de verificação de conta
   */
  public async sendEmailVerification(to: string, data: EmailVerificationData): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Email de verificação não enviado - serviço desabilitado', { to });
        return false;
      }

      emailLogger.info('Enviando email de verificação de conta', { to });

      const success = await emailConfig.sendEmail({
        to,
        template: 'emailVerification',
        variables: {
          name: data.name,
          verificationToken: data.verificationToken,
          verificationUrl: data.verificationUrl || `${environment.frontend.url}/verify-email?token=${data.verificationToken}`,
          expiresIn: data.expiresIn || '24 horas'
        }
      });

      if (success) {
        emailLogger.info('Email de verificação de conta enviado com sucesso', { to });
      } else {
        emailLogger.error('Falha ao enviar email de verificação de conta', { to });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar email de verificação de conta:', { error, to });
      throw error;
    }
  }

  /**
   * Enviar email de status da conta (ativação/suspensão)
   */
  public async sendAccountStatusEmail(to: string, data: AccountStatusEmailData): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Email de status da conta não enviado - serviço desabilitado', { to });
        return false;
      }

      emailLogger.info('Enviando email de status da conta', { to, status: data.status });

      const template = data.status === 'activated' ? 'accountActivated' : 'accountSuspended';
      const subject = data.status === 'activated' 
        ? 'Conta Ativada - Telemetria'
        : 'Conta Suspensa - Telemetria';

      const success = await emailConfig.sendEmail({
        to,
        subject,
        template,
        variables: {
          name: data.name,
          status: data.status,
          reason: data.reason || '',
          contactEmail: data.contactEmail || environment.email.from.address,
          supportUrl: `${environment.frontend.url}/support`
        }
      });

      if (success) {
        emailLogger.info('Email de status da conta enviado com sucesso', { to, status: data.status });
      } else {
        emailLogger.error('Falha ao enviar email de status da conta', { to, status: data.status });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar email de status da conta:', { error, to, status: data.status });
      throw error;
    }
  }

  /**
   * Enviar email personalizado
   */
  public async sendCustomEmail(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    variables?: Record<string, any>;
    attachments?: any[];
  }): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Email personalizado não enviado - serviço desabilitado', { 
          to: options.to, 
          subject: options.subject 
        });
        return false;
      }

      emailLogger.info('Enviando email personalizado', { 
        to: options.to, 
        subject: options.subject,
        template: options.template 
      });

      const success = await emailConfig.sendEmail(options);

      if (success) {
        emailLogger.info('Email personalizado enviado com sucesso', { 
          to: options.to, 
          subject: options.subject 
        });
      } else {
        emailLogger.error('Falha ao enviar email personalizado', { 
          to: options.to, 
          subject: options.subject 
        });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar email personalizado:', { 
        error, 
        to: options.to, 
        subject: options.subject 
      });
      throw error;
    }
  }

  /**
   * Enviar email de notificação de segurança
   */
  public async sendSecurityNotification(to: string, data: {
    name: string;
    event: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    location?: string;
  }): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        emailLogger.info('Notificação de segurança não enviada - serviço desabilitado', { to });
        return false;
      }

      emailLogger.info('Enviando notificação de segurança', { to, event: data.event });

      const success = await emailConfig.sendEmail({
        to,
        subject: 'Alerta de Segurança - Telemetria',
        template: 'securityNotification',
        variables: {
          name: data.name,
          event: data.event,
          ipAddress: data.ipAddress || 'Não disponível',
          userAgent: data.userAgent || 'Não disponível',
          timestamp: data.timestamp || new Date().toLocaleString('pt-BR'),
          location: data.location || 'Não disponível',
          supportEmail: environment.email.from.address
        }
      });

      if (success) {
        emailLogger.info('Notificação de segurança enviada com sucesso', { to, event: data.event });
      } else {
        emailLogger.error('Falha ao enviar notificação de segurança', { to, event: data.event });
      }

      return success;

    } catch (error) {
      emailLogger.error('Erro ao enviar notificação de segurança:', { error, to, event: data.event });
      throw error;
    }
  }

  /**
   * Verificar se serviço de email está disponível
   */
  public async isEmailServiceAvailable(): Promise<boolean> {
    try {
      if (!environment.email.enabled) {
        return false;
      }

      const healthCheck = await emailConfig.healthCheck();
      return healthCheck.status === 'healthy';

    } catch (error) {
      emailLogger.error('Erro ao verificar disponibilidade do serviço de email:', error);
      return false;
    }
  }

  /**
   * Obter templates carregados
   */
  public getLoadedTemplates(): string[] {
    return emailConfig.getLoadedTemplates();
  }

  /**
   * Obter estatísticas do serviço de email
   */
  public async getEmailStats(): Promise<{
    enabled: boolean;
    templatesLoaded: number;
    serviceHealthy: boolean;
  }> {
    try {
      const isHealthy = await this.isEmailServiceAvailable();
      const templates = this.getLoadedTemplates();

      return {
        enabled: environment.email.enabled,
        templatesLoaded: templates.length,
        serviceHealthy: isHealthy
      };

    } catch (error) {
      emailLogger.error('Erro ao obter estatísticas do email:', error);
      return {
        enabled: environment.email.enabled,
        templatesLoaded: 0,
        serviceHealthy: false
      };
    }
  }
}

export const emailService = EmailService.getInstance();
export default emailService;