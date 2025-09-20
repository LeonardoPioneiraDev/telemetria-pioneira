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
  subject?: string; // ✅ Opcional
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
  private isInitialized: boolean = false;

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
      this.isInitialized = true;
      return;
    }

    try {
      logger.info('📧 Inicializando serviço de email...');

      // ✅ CORREÇÃO: Usar a estrutura correta do environment
      this.transporter = nodemailer.createTransport({
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

      // Verificar conexão apenas se debug estiver habilitado
      if (environment.email.debug) {
        await this.verifyConnection();
      }

      // Carregar templates
      await this.loadTemplates();

      this.isInitialized = true;
      logger.info('✅ Serviço de email configurado com sucesso', {
        host: environment.email.smtp.host,
        port: environment.email.smtp.port,
        secure: environment.email.smtp.secure,
        templatesLoaded: this.templates.size
      });

    } catch (error) {
      logger.error('❌ Erro ao configurar serviço de email:', error);
      
      // Se email for obrigatório, re-throw o erro
      if (environment.email.enabled && environment.email.logErrors) {
        throw error;
      } else {
        // Se não for obrigatório, continuar sem email
        logger.warn('⚠️ Continuando sem serviço de email...');
        this.isInitialized = true;
      }
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      throw new Error('Transporter não inicializado');
    }

    try {
      const isConnected = await this.transporter.verify();
      if (isConnected) {
        logger.info('📧 Conexão SMTP verificada com sucesso');
      } else {
        throw new Error('Falha na verificação da conexão SMTP');
      }
    } catch (error) {
      logger.error('❌ Falha na verificação da conexão SMTP:', error);
      throw error;
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
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
          // Criar template padrão se arquivo não existir
          const templateName = file.replace('.html', '');
          const defaultTemplate = this.createDefaultTemplate(templateName);
          this.templates.set(templateName, defaultTemplate);
          
          if (environment.email.debug) {
            logger.debug(`📄 Template padrão criado: ${templateName}`);
          }
        }
      }

      logger.info(`📄 Templates carregados: ${this.templates.size}`);
    } catch (error) {
      logger.warn('⚠️ Erro ao carregar templates, usando templates padrão:', error);
      this.createDefaultTemplates();
    }
  }

  private createDefaultTemplate(templateName: string): string {
    const defaultTemplates = {
      welcome: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bem-vindo ao {{appName}}, {{name}}!</h2>
          <p>Sua conta foi criada com sucesso.</p>
          <p><strong>Nome de usuário:</strong> {{username}}</p>
          <p>Você pode acessar o sistema através do link abaixo:</p>
          <p><a href="{{loginUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Acessar Sistema</a></p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, não responda a esta mensagem.</p>
        </div>
      `,
      resetPassword: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Recuperação de Senha</h2>
          <p>Olá {{name}},</p>
          <p>Você solicitou a recuperação de sua senha. Clique no link abaixo para criar uma nova senha:</p>
          <p><a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Redefinir Senha</a></p>
          <p>Este link é válido por {{expiresIn}}.</p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, não responda a esta mensagem.</p>
        </div>
      `,
      passwordChanged: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Senha Alterada</h2>
          <p>Olá {{name}},</p>
          <p>Sua senha foi alterada com sucesso em {{changeDate}}.</p>
          <p><strong>IP do acesso:</strong> {{ipAddress}}</p>
          <p>Se você não fez esta alteração, entre em contato conosco imediatamente.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, não responda a esta mensagem.</p>
        </div>
      `
    };

    return defaultTemplates[templateName as keyof typeof defaultTemplates] || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>{{appName}}</h2>
        <p>{{message}}</p>
      </div>
    `;
  }

  private createDefaultTemplates(): void {
    const templateNames = ['welcome', 'resetPassword', 'passwordChanged'];
    templateNames.forEach(name => {
      this.templates.set(name, this.createDefaultTemplate(name));
    });
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

    // ✅ CORREÇÃO: Usar a estrutura correta do environment
    const defaultVariables = {
      appName: environment.email.from.name,
      frontendUrl: environment.frontend.url, // ✅ CORRIGIDO: frontend.url
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
      if (environment.email.debug) {
        logger.debug('📧 Email desabilitado, simulando envio:', {
          to: options.to,
          subject: options.subject || 'Template: ' + options.template,
          template: options.template
        });
      }
      return true;
    }

    if (!this.isInitialized) {
      throw new Error('Serviço de email não inicializado');
    }

    if (!this.transporter) {
      throw new Error('Transporter não disponível');
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
          if (!subject) {
            subject = this.getTemplateSubject(options.template);
          }
        }

        // Validar se temos subject
        if (!subject) {
          throw new Error('Subject é obrigatório quando não usando template ou template sem subject padrão');
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
            subject: options.subject,
            template: options.template
          });
        }

        if (attempt >= maxAttempts) {
          if (environment.email.logErrors) {
            throw error;
          } else {
            logger.warn('⚠️ Falha no envio de email após todas as tentativas');
            return false;
          }
        }

        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, environment.email.retryDelay));
      }
    }

    return false;
  }

  private getTemplateSubject(templateName: string): string {
    const subjects = {
      welcome: environment.email.templates.welcomeSubject,
      resetPassword: environment.email.templates.resetPasswordSubject,
      passwordChanged: environment.email.templates.passwordChangedSubject
    };

    return subjects[templateName as keyof typeof subjects] || 'Notificação do Sistema';
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
        loginUrl: variables.loginUrl || `${environment.frontend.url}/login` // ✅ CORRIGIDO
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
        resetUrl: variables.resetUrl || `${environment.frontend.url}/reset-password?token=${variables.resetToken}`, // ✅ CORRIGIDO
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
    status: 'healthy' | 'unhealthy' | 'disabled';
    details: any;
  }> {
    if (!environment.email.enabled) {
      return {
        status: 'disabled',
        details: { message: 'Serviço de email desabilitado' }
      };
    }

    if (!this.isInitialized) {
      return {
        status: 'unhealthy',
        details: { message: 'Serviço não inicializado' }
      };
    }

    try {
      if (!this.transporter) {
        throw new Error('Transporter não disponível');
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
          templatesLoaded: this.templates.size,
          templates: Array.from(this.templates.keys())
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

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  public async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
      logger.info('📧 Serviço de email fechado');
    }
  }
}

export const emailService = EmailConfig.getInstance();
export default emailService;