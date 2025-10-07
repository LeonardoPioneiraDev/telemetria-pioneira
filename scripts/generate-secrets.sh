#!/bin/bash

# ==========================================
# 🔐 GERADOR DE SECRETS PARA PRODUÇÃO
# ==========================================
# Telemetria Pioneira - Gerador de Secrets Seguros
#
# Este script gera secrets criptograficamente seguros
# para uso em produção.
#
# Uso: ./scripts/generate-secrets.sh

set -e  # Para em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==========================================
# 📋 FUNÇÕES AUXILIARES
# ==========================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Função para gerar string aleatória segura
generate_secret() {
    local length=$1
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Função para gerar senha forte
generate_password() {
    local length=${1:-32}
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-"$length"
}

# ==========================================
# 🔍 VERIFICAÇÕES INICIAIS
# ==========================================

print_header "🔐 GERADOR DE SECRETS - TELEMETRIA PIONEIRA"

# Verificar se está na raiz do projeto
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
    print_error "Execute este script na raiz do monorepo!"
    exit 1
fi

# Verificar se openssl está instalado
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL não encontrado. Instale com: brew install openssl (macOS) ou apt-get install openssl (Linux)"
    exit 1
fi

print_success "Verificações iniciais OK"

# ==========================================
# 📁 BACKUP DO ARQUIVO EXISTENTE
# ==========================================

ENV_FILE=".env.production"
BACKUP_DIR="backups/env"

if [ -f "$ENV_FILE" ]; then
    print_warning "Arquivo $ENV_FILE já existe!"
    
    # Criar diretório de backup
    mkdir -p "$BACKUP_DIR"
    
    # Gerar nome do backup com timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/.env.production.backup.$TIMESTAMP"
    
    # Fazer backup
    cp "$ENV_FILE" "$BACKUP_FILE"
    print_success "Backup criado em: $BACKUP_FILE"
    
    # Perguntar se quer sobrescrever
    read -p "Deseja sobrescrever o arquivo existente? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Operação cancelada. Backup mantido em: $BACKUP_FILE"
        exit 0
    fi
fi

# ==========================================
# 🎲 GERAR SECRETS
# ==========================================

print_header "🎲 GERANDO SECRETS SEGUROS"

# Gerar secrets
JWT_SECRET=$(generate_secret 64)
JWT_REFRESH_SECRET=$(generate_secret 64)
DATABASE_PASSWORD=$(generate_password 32)
REDIS_PASSWORD=$(generate_password 32)
ADMIN_PASSWORD=$(generate_password 16)

print_success "JWT_SECRET gerado (64 chars)"
print_success "JWT_REFRESH_SECRET gerado (64 chars)"
print_success "DATABASE_PASSWORD gerado (32 chars)"
print_success "REDIS_PASSWORD gerado (32 chars)"
print_success "ADMIN_PASSWORD gerado (16 chars)"

# ==========================================
# 📝 CRIAR ARQUIVO .env.production
# ==========================================

print_header "📝 CRIANDO ARQUIVO .env.production"

# Verificar se existe o template
if [ ! -f ".env.production.example" ]; then
    print_error "Arquivo .env.production.example não encontrado!"
    exit 1
fi

# Copiar template
cp .env.production.example "$ENV_FILE"

# Exportar variáveis para perl
export JWT_SECRET
export JWT_REFRESH_SECRET
export DATABASE_PASSWORD
export REDIS_PASSWORD
export ADMIN_PASSWORD

# Substituir placeholders usando perl (compatível macOS/Linux)
perl -i.bak -pe 's|<GERAR_JWT_SECRET>|$ENV{JWT_SECRET}|g' "$ENV_FILE"
perl -i.bak -pe 's|<GERAR_JWT_REFRESH_SECRET>|$ENV{JWT_REFRESH_SECRET}|g' "$ENV_FILE"
perl -i.bak -pe 's|<GERAR_DB_PASSWORD>|$ENV{DATABASE_PASSWORD}|g' "$ENV_FILE"
perl -i.bak -pe 's|<GERAR_REDIS_PASSWORD>|$ENV{REDIS_PASSWORD}|g' "$ENV_FILE"
perl -i.bak -pe 's|<CONFIGURAR_SENHA_ADMIN_SEGURA>|$ENV{ADMIN_PASSWORD}|g' "$ENV_FILE"

# Remover arquivo backup do perl
rm -f "${ENV_FILE}.bak"

print_success "Arquivo $ENV_FILE criado com sucesso!"

# ==========================================
# 📋 EXIBIR SECRETS GERADOS
# ==========================================

print_header "🔑 SECRETS GERADOS"

echo -e "${YELLOW}⚠️  ATENÇÃO: Salve estes valores em local seguro!${NC}\n"

echo -e "${GREEN}JWT_SECRET:${NC}"
echo "$JWT_SECRET"
echo ""

echo -e "${GREEN}JWT_REFRESH_SECRET:${NC}"
echo "$JWT_REFRESH_SECRET"
echo ""

echo -e "${GREEN}DATABASE_PASSWORD:${NC}"
echo "$DATABASE_PASSWORD"
echo ""

echo -e "${GREEN}REDIS_PASSWORD:${NC}"
echo "$REDIS_PASSWORD"
echo ""

echo -e "${GREEN}ADMIN_PASSWORD (login inicial):${NC}"
echo "$ADMIN_PASSWORD"
echo ""

# ==========================================
# ✅ PRÓXIMOS PASSOS
# ==========================================

print_header "✅ PRÓXIMOS PASSOS"

echo -e "${YELLOW}Você ainda precisa configurar manualmente:${NC}\n"

echo "1. 📧 Credenciais SMTP:"
echo "   - SMTP_PASS=<senha_real_smtp>"
echo ""

echo "2. 🔑 Credenciais MIX Telematics:"
echo "   - MIX_PASSWORD=<senha_real_mix>"
echo "   - MIX_BASIC_AUTH_TOKEN=<token_real_mix>"
echo ""

echo "3. 🌐 Domínio CORS:"
echo "   - CORS_ORIGIN=https://telemetria.vpioneira.com.br"
echo ""

echo "4. 🔒 Verificar configurações de segurança:"
echo "   - SWAGGER_ENABLED=false"
echo "   - AUTO_CREATE_ADMIN=false"
echo "   - LOG_LEVEL=info"
echo ""

print_warning "Edite o arquivo $ENV_FILE e configure os valores acima"
print_info "Comando: nano $ENV_FILE ou code $ENV_FILE"

# ==========================================
# 🔒 SEGURANÇA DO ARQUIVO
# ==========================================

print_header "🔒 CONFIGURANDO PERMISSÕES"

# Definir permissões restritas (apenas owner pode ler/escrever)
chmod 600 "$ENV_FILE"
print_success "Permissões configuradas (600 - apenas owner)"

# Verificar se está no .gitignore
if ! grep -q ".env.production" .gitignore 2>/dev/null; then
    print_warning ".env.production não está no .gitignore!"
    echo ".env.production" >> .gitignore
    print_success "Adicionado ao .gitignore"
fi

# ==========================================
# 📊 RESUMO FINAL
# ==========================================

print_header "📊 RESUMO"

print_success "Secrets gerados e salvos em: $ENV_FILE"
if [ -n "$BACKUP_FILE" ]; then
    print_success "Backup do arquivo anterior: $BACKUP_FILE"
fi
print_warning "Configure manualmente: SMTP, MIX API e CORS"
print_info "Nunca commite o arquivo .env.production no Git!"

echo -e "\n${GREEN}🎉 Geração de secrets concluída!${NC}\n"

# ==========================================
# 💾 SALVAR SECRETS EM ARQUIVO SEPARADO
# ==========================================

print_info "Salvando cópia dos secrets em arquivo separado..."

SECRETS_FILE="$BACKUP_DIR/secrets.$TIMESTAMP.txt"
cat > "$SECRETS_FILE" << EOF
# ==========================================
# 🔐 SECRETS GERADOS - $(date)
# ==========================================
# IMPORTANTE: Guarde este arquivo em local SEGURO
# e delete após configurar o ambiente de produção

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
DATABASE_PASSWORD=$DATABASE_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
ADMIN_PASSWORD=$ADMIN_PASSWORD

# ==========================================
# 📋 AINDA FALTA CONFIGURAR:
# ==========================================
# - SMTP_PASS (senha do email)
# - MIX_PASSWORD (senha da API MIX)
# - MIX_BASIC_AUTH_TOKEN (token da API MIX)
EOF

chmod 600 "$SECRETS_FILE"
print_success "Cópia dos secrets salva em: $SECRETS_FILE"
print_warning "Delete este arquivo após usar: rm $SECRETS_FILE"

echo ""