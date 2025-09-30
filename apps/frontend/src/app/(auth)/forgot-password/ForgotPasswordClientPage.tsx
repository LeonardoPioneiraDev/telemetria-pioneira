/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(auth)/forgot-password/ForgotPasswordClientPage.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle,
  KeyRound,
  Loader2,
  Mail,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: '',
    },
  });

  // Validação manual (mantendo consistência com a aplicação modelo)
  const validateEmail = (email: string): string | null => {
    if (!email || email.trim().length === 0) {
      return 'Email é obrigatório';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email inválido';
    }

    return null;
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    // Validação manual
    const emailError = validateEmail(data.email);
    if (emailError) {
      form.setError('email', { message: emailError });
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedData = {
        email: data.email.toLowerCase().trim(),
      };

      // Usando a mesma API da aplicação atual
      await api.post('/auth/password/reset-request', normalizedData);

      setSubmittedEmail(normalizedData.email);
      setIsSuccess(true);

      toast.success('Email enviado!', {
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
    } catch (error: any) {
      console.error('❌ Erro ao solicitar recuperação:', error);

      toast.error('Erro ao enviar email', {
        description: error.response?.data?.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tela de sucesso
  if (isSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/10 to-teal-500/5"></div>

        {/* Animated Background Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo e Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-2xl">
                    <Image
                      src="/logo.png"
                      alt="Sistema de Telemetria"
                      width={160}
                      height={45}
                      className="h-10 w-auto mx-auto"
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  Email Enviado!
                </h1>
                <p className="text-neutral-300 text-sm">Verifique sua caixa de entrada</p>
              </div>
            </div>

            {/* Card de Sucesso */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20">
              <CardHeader className="space-y-2 text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <CheckCircle className="h-6 w-6 text-neutral-900" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">
                    Instruções Enviadas
                  </CardTitle>
                  <CardDescription className="text-neutral-300 text-sm">
                    Se o email existir em nosso sistema, você receberá as instruções
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-300">Email enviado para:</p>
                      <p className="text-sm text-green-200 font-mono bg-green-500/10 px-2 py-1 rounded">
                        {submittedEmail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">📋 Próximos passos:</h4>
                  <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Verifique sua caixa de entrada</li>
                    <li>Procure também na pasta de spam</li>
                    <li>Clique no link do email</li>
                    <li>Defina sua nova senha</li>
                  </ol>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <KeyRound className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-300">Link expira em 1 hora</p>
                      <p className="text-xs text-amber-200">
                        Por motivos de segurança, o link de recuperação expira em 60 minutos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => {
                      setIsSuccess(false);
                      form.reset();
                    }}
                    variant="outline"
                    className="w-full h-11 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar para outro email
                  </Button>

                  <Button
                    asChild
                    className="w-full h-11 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-neutral-900 font-semibold shadow-lg shadow-green-500/25"
                  >
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar ao Login
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Tela de formulário
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/10 to-pink-500/5"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>

      {/* Floating Icons */}
      <div className="absolute top-32 right-32 opacity-20">
        <Award
          className="h-8 w-8 text-orange-400 animate-bounce"
          style={{ animationDelay: '0s' }}
        />
      </div>
      <div className="absolute bottom-40 left-40 opacity-20">
        <Zap className="h-6 w-6 text-red-400 animate-bounce" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute top-40 left-20 opacity-20">
        <TrendingUp
          className="h-7 w-7 text-pink-400 animate-bounce"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo e Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-2xl">
                  <Image
                    src="/logo.png"
                    alt="Sistema de Telemetria"
                    width={160}
                    height={45}
                    className="h-10 w-auto mx-auto"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Recuperar Senha
              </h1>
              <p className="text-neutral-300 text-sm">Digite seu email para receber instruções</p>
            </div>
          </div>

          {/* Card de Recuperação */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <KeyRound className="h-6 w-6 text-neutral-900" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Esqueceu sua senha?</CardTitle>
                <CardDescription className="text-neutral-300 text-sm">
                  Não se preocupe, vamos ajudar você a recuperá-la
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Campo Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-200">
                          Email cadastrado
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-orange-400 transition-colors" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="seu.email@exemplo.com"
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-orange-400 focus:ring-orange-400/20 h-11 backdrop-blur-sm"
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />

                  {/* Botão de Submit */}
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-neutral-900 font-semibold shadow-lg shadow-orange-500/25 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Enviar Instruções</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>

                  {/* Botão Voltar */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-neutral-300 hover:text-orange-400 hover:bg-white/5 transition-all duration-300"
                    onClick={() => router.push('/login')}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao login
                  </Button>
                </form>
              </Form>

              {/* Informações de Segurança */}
              <div className="text-center space-y-2 pt-3 border-t border-white/10">
                <p className="text-xs text-neutral-400">
                  Não recebeu o email? Verifique sua pasta de spam
                </p>
                <div className="flex items-center justify-center space-x-2 text-xs text-neutral-500">
                  <KeyRound className="h-3 w-3" />
                  <span>Link de recuperação expira em 1 hora</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-xs text-neutral-400">© 2025 Sistema de Telemetria</p>
          </div>
        </div>
      </div>
    </div>
  );
}
