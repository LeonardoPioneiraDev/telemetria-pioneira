# ==========================================
# 🏗️ STAGE 1: BUILDER
# ==========================================
FROM node:18-alpine AS builder

# Metadados
LABEL maintainer="Felipe Batista <felipe@vpioneira.com.br>"
LABEL description="Telemetria Pioneira - Backend Builder"

# Instalar dependências do sistema necessárias para build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Instalar pnpm globalmente
RUN npm install -g pnpm@8.15.0

# Configurar diretório de trabalho
WORKDIR /build

# Copiar arquivos de configuração do workspace (monorepo)
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY turbo.json ./

# Copiar package.json do backend
COPY apps/backend/package.json ./apps/backend/

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN pnpm install --frozen-lockfile

# Copiar código-fonte do backend
COPY apps/backend ./apps/backend

# Build do TypeScript
WORKDIR /build/apps/backend
RUN pnpm build

# Limpar devDependencies após build
RUN pnpm install --prod --frozen-lockfile

# ==========================================
# 🚀 STAGE 2: RUNNER (Produção)
# ==========================================
FROM node:18-alpine AS runner

# Metadados
LABEL maintainer="Felipe Batista <felipe@vpioneira.com.br>"
LABEL description="Telemetria Pioneira - Backend Production"
LABEL version="1.0.0"

# Instalar apenas dependências de runtime necessárias
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata \
    tini

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Configurar timezone (Brasília)
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Configurar diretório de trabalho
WORKDIR /app

# Copiar node_modules de produção do builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/node_modules ./apps/backend/node_modules

# Copiar código compilado (dist) e arquivos necessários
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/package.json ./package.json

# Copiar templates de email (necessários em runtime)
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/src/templates ./src/templates

# Criar diretório de logs com permissões corretas
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Variáveis de ambiente padrão (sobrescritas pelo docker-compose)
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    LOG_TO_CONSOLE=true

# Expor porta da aplicação
EXPOSE 3333

# Mudar para usuário não-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3333/health || exit 1

# Usar tini para gerenciamento correto de sinais (graceful shutdown)
ENTRYPOINT ["/sbin/tini", "--"]

# Comando padrão (API)
# Para workers, sobrescrever com: command: ["node", "dist/workers/event-ingestion-runner.js"]
CMD ["node", "dist/server.js"]