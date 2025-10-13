/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(auth)/reset-password/ResetPasswordClientPage.tsx
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
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validations';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function ResetPasswordClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Capturar token da URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      setIsValidToken(true);
    } else {
      setIsValidToken(false);
    }
  }, [searchParams]);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Token inválido', {
        description: 'Link de recuperação inválido ou expirado.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Usando a mesma API da aplicação atual
      await api.post('/auth/password/reset', {
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      setIsSuccess(true);

      toast.success('Senha redefinida!', {
        description: 'Sua senha foi alterada com sucesso.',
      });
    } catch (error: any) {
      console.error('❌ Erro ao redefinir senha:', error);

      let errorMessage = 'Erro ao redefinir senha. Tente novamente.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        // Tratar erros específicos de validação
        const validationError = error.response.data.errors[0];
        if (validationError.includes('caracteres repetidos')) {
          errorMessage = 'A senha não pode ter mais de 3 caracteres iguais em sequência (ex: aaaa).';
        } else if (validationError.includes('padrões comuns')) {
          errorMessage = 'A senha contém padrões muito comuns. Tente uma senha mais única.';
        } else {
          errorMessage = validationError;
        }
      } else if (error.message?.includes('Token inválido')) {
        errorMessage = 'Link de recuperação inválido ou expirado.';
      } else if (error.message?.includes('Token expirado')) {
        errorMessage = 'Link de recuperação expirado. Solicite um novo.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
      }

      toast.error('Erro ao redefinir senha', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tela de erro - token inválido
  if (isValidToken === false) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-orange-500/10 to-yellow-500/5"></div>

        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="bg-white/10 backdrop-blur-xl border border-red-500/20 shadow-2xl shadow-black/20">
              <CardHeader className="space-y-2 text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-r from-red-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                  <Shield className="h-6 w-6 text-neutral-900" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">Link Inválido</CardTitle>
                  <CardDescription className="text-neutral-300 text-sm">
                    Este link de recuperação não é válido ou expirou
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-center">
                <p className="text-neutral-300 text-sm">
                  O link de recuperação pode ter expirado ou já foi utilizado. Solicite um novo link
                  para redefinir sua senha.
                </p>

                <div className="space-y-3">
                  <Button
                    asChild
                    className="w-full h-11 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-neutral-900 font-semibold"
                  >
                    <Link href="/forgot-password">
                      <KeyRound className="h-4 w-4 mr-2" />
                      Solicitar Novo Link
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 bg-white/10 border-white/20 text-white hover:bg-white/20"
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

  // Tela de sucesso
  if (isSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/10 to-teal-500/5"></div>

        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20">
              <CardHeader className="space-y-2 text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <CheckCircle className="h-6 w-6 text-neutral-900" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">Senha Redefinida!</CardTitle>
                  <CardDescription className="text-neutral-300 text-sm">
                    Sua senha foi alterada com sucesso
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-center">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-green-200 mb-2">
                    🎉 Pronto! Sua nova senha está ativa.
                  </p>
                  <p className="text-xs text-green-300">
                    Agora você pode fazer login normalmente com sua nova senha.
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full h-11 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-neutral-900 font-semibold shadow-lg shadow-green-500/25"
                >
                  <Link href="/login">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Fazer Login
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Tela de loading se ainda validando token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-purple-600 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-purple-300 font-medium">Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  // Tela principal do formulário
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/10 to-rose-500/5"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>

      {/* Floating Icons */}
      <div className="absolute top-32 right-32 opacity-20">
        <Award
          className="h-8 w-8 text-purple-400 animate-bounce"
          style={{ animationDelay: '0s' }}
        />
      </div>
      <div className="absolute bottom-40 left-40 opacity-20">
        <Zap className="h-6 w-6 text-pink-400 animate-bounce" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute top-40 left-20 opacity-20">
        <TrendingUp
          className="h-7 w-7 text-rose-400 animate-bounce"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo e Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Nova Senha
              </h1>
              <p className="text-neutral-300 text-sm">Defina uma senha forte e segura</p>
            </div>
          </div>

          {/* Card de Reset */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <KeyRound className="h-6 w-6 text-neutral-900" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Redefinir Senha</CardTitle>
                <CardDescription className="text-neutral-300 text-sm">
                  Crie uma nova senha para sua conta
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Campo Nova Senha */}
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-200">
                          Nova Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-purple-400 transition-colors" />
                            <Input
                              {...field}
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="Digite sua nova senha"
                              className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-purple-400 focus:ring-purple-400/20 h-11 backdrop-blur-sm"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-purple-400"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />

                  {/* Campo Confirmar Senha */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-200">
                          Confirmar Nova Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-purple-400 transition-colors" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirme sua nova senha"
                              className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-purple-400 focus:ring-purple-400/20 h-11 backdrop-blur-sm"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-purple-400"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />

                  {/* Critérios de Senha */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-purple-300 mb-2">
                      🛡️ Sua senha deve conter:
                    </h4>
                    <ul className="text-xs text-purple-200 space-y-1">
                      <li>• Pelo menos 8 caracteres</li>
                      <li>• Uma letra maiúscula (A-Z)</li>
                      <li>• Uma letra minúscula (a-z)</li>
                      <li>• Um número (0-9)</li>
                      <li>• Um caractere especial (!@#$%^&*)</li>
                    </ul>
                  </div>

                  {/* Botão de Submit */}
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-neutral-900 font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Alterando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Redefinir Senha</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>

                  {/* Botão Voltar */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-neutral-300 hover:text-purple-400 hover:bg-white/5"
                    onClick={() => router.push('/login')}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao login
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
