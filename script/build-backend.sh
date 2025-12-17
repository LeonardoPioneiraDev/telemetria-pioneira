#!/bin/bash

# ==========================================
# 🔧 TELEMETRIA PIONEIRA - BUILD BACKEND IMAGE
# ==========================================
# Script para buildar apenas a imagem Docker do backend
# Uso: ./script/build-backend.sh [versao]
# Exemplo: ./script/build-backend.sh 1.3.0
# ==========================================

set -e  # Para na primeira falha

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Configuracoes
DOCKER_USERNAME="felipebatista54"
IMAGE_NAME="telemetria-backend"

# Verificar se foi passada uma versao
if [ -z "$1" ]; then
    log_warning "Nenhuma versao especificada, usando 'latest'"
    VERSION="latest"
else
    VERSION="$1"
fi

log_info "=========================================="
log_info "🔧 BUILD BACKEND - TELEMETRIA PIONEIRA"
log_info "=========================================="
log_info "Versao: $VERSION"
log_info "Imagem: ${DOCKER_USERNAME}/${IMAGE_NAME}"
log_info ""

# Verificar se esta na raiz do projeto
if [ ! -d "apps/backend" ]; then
    log_error "Diretorio apps/backend nao encontrado!"
    log_error "Execute este script da raiz do projeto."
    exit 1
fi

# Verificar se Dockerfile existe
if [ ! -f "apps/backend/Dockerfile.prod" ]; then
    log_error "Dockerfile.prod nao encontrado em apps/backend/!"
    exit 1
fi

# ==========================================
# BUILD BACKEND
# ==========================================
log_step "Iniciando build do backend..."
log_info "Contexto: . (raiz do monorepo)"
log_info "Dockerfile: apps/backend/Dockerfile.prod"
echo ""

# Mostrar informacoes do build
log_step "Configuracoes do build:"
echo "  • Multi-stage build: ✓"
echo "  • Node.js: 20-alpine"
echo "  • Plataforma: linux/amd64"
echo "  • Otimizado para producao: ✓"
echo ""

# Executar build
docker build \
    -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} \
    -t ${DOCKER_USERNAME}/${IMAGE_NAME}:latest \
    --platform linux/amd64 \
    --progress=plain \
    -f apps/backend/Dockerfile.prod \
    .

BUILD_STATUS=$?

# Verificar resultado
if [ $BUILD_STATUS -eq 0 ]; then
    log_success "Backend image criada com sucesso!"
    echo ""
    log_info "Imagens criadas:"
    echo "  • ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
    echo "  • ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    echo ""

    # Mostrar tamanho da imagem
    IMAGE_SIZE=$(docker images ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} --format "{{.Size}}")
    log_info "Tamanho da imagem: ${IMAGE_SIZE}"

    exit 0
else
    log_error "Falha ao criar backend image!"
    log_error "Verifique os logs acima para detalhes do erro."
    exit 1
fi
