import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { environment } from './environment.js';
import { logger } from '../shared/utils/logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  variables?: Record<string, any>;
  attachments?: any[];
}

export class EmailConfig {
  private static instance: EmailConfig;
  private transporter: Transporter | null = null;
  private templates: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): EmailConfig {
    if (!EmailConfig.instance) {
      EmailConfig.instance = new EmailConfig();
    }
    return EmailConfig.instance;
  }

  public async initialize(): Promise<void> {
    if (!environment.email.enabled) {
      logger.info('📧 Serviço de email desabilitado');
      return;
    }

    try {
      // Configuração do transporter
      this.transporter = nodemailer.createTransporter({
        host: environment.email.smtp.host,
        port: environment.email.smtp.port,
        secure: environment.email.smtp.secure,
        auth: {
          user: environment.email.smtp.user,
          pass: environment.email.smtp.pass
        },
        tls: {
          rejectUnauthorized: !environment.email.smtp.ignoreTls
        },
        connectionTimeout: environment.email.timeout,
        greetingTimeout: environment.email.timeout,
        socketTimeout: environment.email.timeout
      });

      // Verificar conexão
      await this.verifyConnection();

      // Carregar templates
      await this.loadTemplates();

      logger.info('✅ Serviço de email configurado com sucesso');

    } catch (error) {
      logger.error('❌ Erro ao configurar serviço de email:', error);
      if (environment.email.logErrors) {
        throw error;
      }
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      throw new Error('Transporter não inicializado');
    }

    try {
      await this.transporter.verify();
      logger.info('📧 Conexão SMTP verificada com sucesso');
    } catch (error) {
      logger.error('❌ Falha na verificação da conexão SMTP:', error);
      throw error;
    }
  }

  private async loadTemplates(): Promise<void> {
    const templatesDir = environment.email.templates.dir;
    const templateFiles = ['welcome.html', 'resetPassword.html', 'passwordChanged.html'];

    for (const file of templateFiles) {
      try {
        const templatePath = join(process.cwd(), templatesDir, file);
        const templateContent = readFileSync(templatePath, 'utf-8');
        const templateName = file.replace('.html', '');
        this.templates.set(templateName, templateContent);
        
        if (environment.email.debug) {
          logger.debug(`📄 Template carregado: ${templateName}`);
        }
      } catch (error) {
        logger.warn(`⚠️ Não foi possível carregar o template ${file}:`, error);
      }
    }
  }

  private processTemplate(templateName: string, variables: Record<string, any> = {}): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' não encontrado`);
    }

    let processedTemplate = template;

    // Substituir variáveis no formato {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, String(value));
    });

    // Adicionar variáveis padrão
    const defaultVariables = {
      appName: environment.email.from.name,
      frontendUrl: environment.frontend.url,
      supportEmail: environment.email.from.address,
      currentYear: new Date().getFullYear()
    };

    Object.entries(defaultVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, String(value));
    });

    return processedTemplate;
  }

  public async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!environment.email.enabled) {
      logger.warn('📧 Tentativa de envio de email com serviço desabilitado');
      return false;
    }

    if (!this.transporter) {
      throw new Error('Serviço de email não inicializado');
    }

    let attempt = 0;
    const maxAttempts = environment.email.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        let html = options.html;
        let subject = options.subject;

        // Processar template se especificado
        if (options.template) {
          html = this.processTemplate(options.template, options.variables);
          
          // Usar subject do template se não especificado
          if (!options.subject) {
            switch (options.template) {
              case 'welcome':
                subject = environment.email.templates.welcomeSubject;
                break;
              case 'resetPassword':
                subject = environment.email.templates.resetPasswordSubject;
                break;
              case 'passwordChanged':
                subject = environment.email.templates.passwordChangedSubject;
                break;
              default:
                subject = 'Notificação do Sistema';
            }
          }
        }

        const mailOptions: SendMailOptions = {
          from: {
            name: environment.email.from.name,
            address: environment.email.from.address
          },
          to: options.to,
          subject: subject,
          html: html,
          text: options.text,
          attachments: options.attachments
        };

        const info = await this.transporter.sendMail(mailOptions);

        if (environment.email.debug) {
          logger.debug('📧 Email enviado com sucesso:', {
            messageId: info.messageId,
            to: options.to,
            subject: subject,
            template: options.template
          });
        }

        logger.info('✅ Email enviado com sucesso', {
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: subject
        });

        return true;

      } catch (error) {
        attempt++;
        
        if (environment.email.logErrors) {
          logger.error(`❌ Erro no envio de email (tentativa ${attempt}/${maxAttempts}):`, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            to: options.to,
            subject: options.subject
          });
        }

        if (attempt >= maxAttempts) {
          throw error;
        }

        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, environment.email.retryDelay));
      }
    }

    return false;
  }

  public async sendWelcomeEmail(to: string, variables: {
    name: string;
    username: string;
    loginUrl?: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'welcome',
      variables: {
        ...variables,
        loginUrl: variables.loginUrl || `${environment.frontend.url}/login`
      }
    });
  }

  public async sendPasswordResetEmail(to: string, variables: {
    name: string;
    resetToken: string;
    resetUrl?: string;
    expiresIn?: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'resetPassword',
      variables: {
        ...variables,
        resetUrl: variables.resetUrl || `${environment.frontend.url}/reset-password?token=${variables.resetToken}`,
        expiresIn: variables.expiresIn || '1 hora'
      }
    });
  }

  public async sendPasswordChangedEmail(to: string, variables: {
    name: string;
    changeDate?: string;
    ipAddress?: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'passwordChanged',
      variables: {
        ...variables,
        changeDate: variables.changeDate || new Date().toLocaleString('pt-BR'),
        ipAddress: variables.ipAddress || 'Não disponível'
      }
    });
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    if (!environment.email.enabled) {
      return {
        status: 'healthy',
        details: { message: 'Serviço de email desabilitado' }
      };
    }

    try {
      if (!this.transporter) {
        throw new Error('Transporter não inicializado');
      }

      const start = Date.now();
      await this.transporter.verify();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        details: {
          responseTime: `${responseTime}ms`,
          host: environment.email.smtp.host,
          port: environment.email.smtp.port,
          templatesLoaded: this.templates.size
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          host: environment.email.smtp.host,
          port: environment.email.smtp.port
        }
      };
    }
  }

  public getLoadedTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}

export const emailService = EmailConfig.getInstance();
export default emailService;