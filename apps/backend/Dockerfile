FROM node:20-alpine

# Instalar dependências do sistema e pnpm
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash \
 && npm install -g pnpm@8.15.0

WORKDIR /app

# Copiar arquivos de configuração do monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copiar arquivos de dependências do backend
COPY apps/backend/package.json ./apps/backend/

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte do backend
COPY apps/backend ./apps/backend

# Definir working directory para o backend
WORKDIR /app/apps/backend

# Criar diretórios necessários
RUN mkdir -p logs src/templates/email

# Expor porta
EXPOSE 3333

# Comando de saúde
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3333/health || exit 1

# Comando padrão
CMD ["npm", "run", "start:docker"]