#!/bin/bash

# ==========================================
# 🎨 TELEMETRIA PIONEIRA - BUILD FRONTEND IMAGE
# ==========================================
# Script para buildar apenas a imagem Docker do frontend
# Uso: ./script/build-frontend.sh [versao] [api_url]
# Exemplo: ./script/build-frontend.sh 1.3.0 https://telemetriaapi.vpioneira.com.br/api
# ==========================================

set -e  # Para na primeira falha

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Funcao para log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}🔹 $1${NC}"
}

log_build() {
    echo -e "${MAGENTA}🏗️  $1${NC}"
}

# Configuracoes
DOCKER_USERNAME="felipebatista54"
IMAGE_NAME="telemetria-frontend"
DEFAULT_API_URL="https://telemetriaapi.vpioneira.com.br/api"

# Verificar se foi passada uma versao
if [ -z "$1" ]; then
    log_warning "Nenhuma versao especificada, usando 'latest'"
    VERSION="latest"
else
    VERSION="$1"
fi

# Verificar se foi passada uma API URL
if [ -z "$2" ]; then
    API_URL=$DEFAULT_API_URL
    log_info "Usando API URL padrao: $API_URL"
else
    API_URL="$2"
fi

log_info "=========================================="
log_info "🎨 BUILD FRONTEND - TELEMETRIA PIONEIRA"
log_info "=========================================="
log_info "Versao: $VERSION"
log_info "Imagem: ${DOCKER_USERNAME}/${IMAGE_NAME}"
log_info "API URL: $API_URL"
log_info ""

# Verificar se esta na raiz do projeto
if [ ! -d "apps/frontend" ]; then
    log_error "Diretorio apps/frontend nao encontrado!"
    log_error "Execute este script da raiz do projeto."
    exit 1
fi

# Verificar se Dockerfile existe
if [ ! -f "apps/frontend/Dockerfile.prod" ]; then
    log_error "Dockerfile.prod nao encontrado em apps/frontend/!"
    exit 1
fi

# ==========================================
# BUILD FRONTEND
# ==========================================
log_step "Iniciando build do frontend..."
log_info "Contexto: . (raiz do monorepo)"
log_info "Dockerfile: apps/frontend/Dockerfile.prod"
echo ""

# Mostrar informacoes do build
log_step "Configuracoes do build:"
echo "  • Multi-stage build: ✓"
echo "  • Framework: Next.js"
echo "  • Plataforma: linux/amd64"
echo "  • API URL: $API_URL"
echo "  • Otimizado para producao: ✓"
echo ""

# Executar build
log_build "Buildando frontend com Next.js..."
log_build "Isso pode levar alguns minutos..."
echo ""

docker build \
    -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} \
    -t ${DOCKER_USERNAME}/${IMAGE_NAME}:latest \
    --build-arg NEXT_PUBLIC_API_URL=${API_URL} \
    --build-arg NEXT_PUBLIC_APP_NAME="Telemetria Pioneira" \
    --build-arg NEXT_PUBLIC_APP_VERSION=${VERSION} \
    --platform linux/amd64 \
    --progress=plain \
    -f apps/frontend/Dockerfile.prod \
    .

BUILD_STATUS=$?

# Verificar resultado
if [ $BUILD_STATUS -eq 0 ]; then
    log_success "Frontend image criada com sucesso!"
    echo ""
    log_info "Imagens criadas:"
    echo "  • ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
    echo "  • ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    echo ""

    # Mostrar tamanho da imagem
    IMAGE_SIZE=$(docker images ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} --format "{{.Size}}")
    log_info "Tamanho da imagem: ${IMAGE_SIZE}"

    # Mostrar informacoes extras
    echo ""
    log_info "📝 Notas importantes:"
    echo "  • Aplicacao roda na porta 3000 dentro do container"
    echo "  • Next.js em modo standalone"
    echo "  • Assets otimizados e compactados"

    exit 0
else
    log_error "Falha ao criar frontend image!"
    log_error "Verifique os logs acima para detalhes do erro."
    exit 1
fi
