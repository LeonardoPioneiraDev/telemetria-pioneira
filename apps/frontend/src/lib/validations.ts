// src/lib/validations.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').toLowerCase(),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Nova senha é obrigatória')
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
      .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/\d/, 'Deve conter pelo menos um número')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/,
        'Deve conter pelo menos um caractere especial'
      ),
    confirmPassword: z.string().min(1, 'Confirmação é obrigatória'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

export const firstLoginSchema = z
  .object({
    tempPassword: z.string().min(1, 'Senha temporária é obrigatória'),
    newPassword: z
      .string()
      .min(1, 'Nova senha é obrigatória')
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
      .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/\d/, 'Deve conter pelo menos um número')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/,
        'Deve conter pelo menos um caractere especial'
      ),
    confirmPassword: z.string().min(1, 'Confirmação é obrigatória'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type FirstLoginFormData = z.infer<typeof firstLoginSchema>;
