import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ==========================================
  // 🚀 OTIMIZAÇÕES PARA PRODUÇÃO
  // ==========================================

  // Standalone output - Reduz tamanho da imagem Docker em ~80%
  output: 'standalone',

  // Compressão de assets
  compress: true,

  // ==========================================
  // 🔒 SEGURANÇA
  // ==========================================

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // ==========================================
  // 🖼️ IMAGENS
  // ==========================================

  images: {
    // Domínios permitidos para otimização de imagens
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'telemetriaapi.vpioneira.com.br',
      },
    ],
    // Formatos de imagem otimizados
    formats: ['image/avif', 'image/webp'],
  },

  // ==========================================
  // ⚡ PERFORMANCE
  // ==========================================

  // React Strict Mode para detectar problemas
  reactStrictMode: true,

  // ==========================================
  // 🌐 INTERNACIONALIZAÇÃO (OPCIONAL)
  // ==========================================

  // i18n: {
  //   locales: ['pt-BR', 'en'],
  //   defaultLocale: 'pt-BR',
  // },

  // ==========================================
  // 🔧 EXPERIMENTAL
  // ==========================================

  experimental: {
    // Otimizações de memória
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
