/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(auth)/first-login/FirstLoginClientPage.tsx
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
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface FirstLoginFormData {
  newPassword: string;
  confirmPassword: string;
}

export default function FirstLoginClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Verificar se já está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Capturar token da URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const form = useForm<FirstLoginFormData>({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Validação manual
  const validateForm = (data: FirstLoginFormData): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};

    // Validar nova senha
    if (!data.newPassword) {
      errors.newPassword = 'Nova senha é obrigatória';
    } else if (data.newPassword.length < 8) {
      errors.newPassword = 'Nova senha deve ter pelo menos 8 caracteres';
    } else if (!/[a-z]/.test(data.newPassword)) {
      errors.newPassword = 'Deve conter pelo menos uma letra minúscula';
    } else if (!/[A-Z]/.test(data.newPassword)) {
      errors.newPassword = 'Deve conter pelo menos uma letra maiúscula';
    } else if (!/\d/.test(data.newPassword)) {
      errors.newPassword = 'Deve conter pelo menos um número';
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(data.newPassword)) {
      errors.newPassword = 'Deve conter pelo menos um caractere especial';
    }

    // Validar confirmação
    if (!data.confirmPassword) {
      errors.confirmPassword = 'Confirmação é obrigatória';
    } else if (data.newPassword !== data.confirmPassword) {
      errors.confirmPassword = 'Senhas não coincidem';
    }

    return errors;
  };

  const onSubmit = async (data: FirstLoginFormData) => {
    const validationErrors = validateForm(data);

    if (Object.keys(validationErrors).length > 0) {
      Object.entries(validationErrors).forEach(([field, message]) => {
        form.setError(field as keyof FirstLoginFormData, { message });
      });
      return;
    }

    if (!token) {
      toast.error('Erro de validação', {
        description: 'Token não encontrado na URL.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // const response = await api.post('/auth/password/reset', {
      //   token: token,
      //   newPassword: data.newPassword,
      //   confirmPassword: data.confirmPassword,
      // });

      // console.log('Resposta da API:', response.data);

      setIsSuccess(true);
      toast.success('Senha definida com sucesso!', {
        description: 'Você será redirecionado para a tela de login.',
      });

      // Redireciona para o login
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Erro no primeiro login:', error);
      console.error('Resposta do erro:', error.response?.data);

      let errorMessage = 'Ocorreu um erro ao definir sua senha.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error === 'INVALID_RESET_TOKEN') {
        errorMessage = 'Token inválido ou expirado.';
      } else if (error.response?.data?.error === 'VALIDATION_ERROR') {
        errorMessage = 'Erro de validação. Verifique os dados informados.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Endpoint não encontrado. Verifique a configuração da API.';
      }

      toast.error('Erro', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se não há token na URL, mostrar erro
  if (!token) {
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
                    Este link de primeiro acesso não é válido
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-center">
                <p className="text-neutral-300 text-sm">
                  O link não contém um token válido. Entre em contato com o administrador para
                  receber um novo convite.
                </p>

                <div className="space-y-3">
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
                  <CardTitle className="text-xl font-bold text-white">🎉 Bem-vindo!</CardTitle>
                  <CardDescription className="text-neutral-300 text-sm">
                    Sua conta está pronta para uso
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-center">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <UserCheck className="h-5 w-5 text-green-400" />
                    <p className="text-sm font-medium text-green-300">
                      Senha definida com sucesso!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm text-emerald-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecionando para o login...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Tela principal do formulário
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/10 to-indigo-500/5"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>

      {/* Floating Icons */}
      <div className="absolute top-32 right-32 opacity-20">
        <Award className="h-8 w-8 text-cyan-400 animate-bounce" style={{ animationDelay: '0s' }} />
      </div>
      <div className="absolute bottom-40 left-40 opacity-20">
        <Zap className="h-6 w-6 text-blue-400 animate-bounce" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute top-40 left-20 opacity-20">
        <TrendingUp
          className="h-7 w-7 text-indigo-400 animate-bounce"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo e Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Primeiro Acesso
              </h1>
              <p className="text-neutral-300 text-sm">Configure sua senha para acessar o sistema</p>
            </div>
          </div>

          {/* Card de First Login */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <UserCheck className="h-6 w-6 text-neutral-900" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">
                  Bem-vindo ao Sistema!
                </CardTitle>
                <CardDescription className="text-neutral-300 text-sm">
                  Configure sua senha de acesso
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Debug info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-200">
                  <strong>Token:</strong> {token}
                </p>
              </div>

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
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-cyan-400 transition-colors" />
                            <Input
                              {...field}
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="Crie uma senha forte"
                              className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-cyan-400 focus:ring-cyan-400/20 h-11 backdrop-blur-sm"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-cyan-400"
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

                  {/* Campo Confirmar Nova Senha */}
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
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-cyan-400 transition-colors" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirme sua nova senha"
                              className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-cyan-400 focus:ring-cyan-400/20 h-11 backdrop-blur-sm"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-cyan-400"
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
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-cyan-300 mb-2">
                      🛡️ Sua nova senha deve conter:
                    </h4>
                    <ul className="text-xs text-cyan-200 space-y-1">
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
                    className="w-full h-11 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-neutral-900 font-semibold shadow-lg shadow-cyan-500/25 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Configurando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Definir Senha</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>

                  {/* Botão Voltar */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-neutral-300 hover:text-cyan-400 hover:bg-white/5"
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
