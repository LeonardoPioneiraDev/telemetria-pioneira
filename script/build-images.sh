#!/bin/bash

# ==========================================
# 🚀 TELEMETRIA PIONEIRA - BUILD DOCKER IMAGES
# ==========================================
# Script inteligente para buildar imagens Docker
# Por padrao, faz push automatico para Docker Hub apos o build.
#
# Uso:
#   ./script/build-images.sh [versao]              # Ambos (backend + frontend)
#   ./script/build-images.sh backend [versao]      # Apenas backend
#   ./script/build-images.sh frontend [versao]     # Apenas frontend
#   ./script/build-images.sh both [versao]         # Ambos (explicito)
#
# Exemplos:
#   ./script/build-images.sh 1.3.0                 # Build ambos 1.3.0 e faz push
#   ./script/build-images.sh backend 1.3.0         # Build so backend 1.3.0 e faz push
#   ./script/build-images.sh frontend --no-push    # Build so frontend sem push
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

log_header() {
    echo -e "${CYAN}$1${NC}"
}

# Funcao para mostrar ajuda
show_help() {
    log_header "╔════════════════════════════════════════════════════════════╗"
    log_header "║       🚀 TELEMETRIA PIONEIRA - BUILD IMAGES               ║"
    log_header "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Uso:"
    echo "  ./script/build-images.sh [versao]              # Ambos (backend + frontend)"
    echo "  ./script/build-images.sh backend [versao]      # Apenas backend"
    echo "  ./script/build-images.sh frontend [versao]     # Apenas frontend"
    echo "  ./script/build-images.sh both [versao]         # Ambos (explicito)"
    echo ""
    log_info "Exemplos:"
    echo "  ./script/build-images.sh 1.3.0                 # Build ambos 1.3.0"
    echo "  ./script/build-images.sh backend 1.3.0         # Build so backend 1.3.0"
    echo "  ./script/build-images.sh frontend              # Build so frontend latest"
    echo "  ./script/build-images.sh                       # Build ambos latest"
    echo ""
    log_info "Flags adicionais:"
    echo "  --no-push                                      # Nao faz push (so build)"
    echo "  --help, -h                                     # Mostra esta ajuda"
    echo ""
    log_warning "Nota: Por padrao, o script faz push automatico para o Docker Hub apos o build."
    echo ""
}

# Verificar se pediu ajuda
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Configuracoes
DOCKER_USERNAME="felipebatista54"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Variaveis para controle
BUILD_TARGET="both"
VERSION="latest"
AUTO_PUSH=true
NO_PUSH=false

# ==========================================
# PARSE DE ARGUMENTOS
# ==========================================

# Se primeiro argumento e "backend", "frontend" ou "both"
if [[ "$1" == "backend" ]] || [[ "$1" == "frontend" ]] || [[ "$1" == "both" ]]; then
    BUILD_TARGET="$1"
    # Versao e o segundo argumento
    if [ -n "$2" ] && [[ "$2" != --* ]]; then
        VERSION="$2"
    fi
    # Flags sao a partir do 3o argumento
    shift 2 2>/dev/null || shift 1 2>/dev/null || true
else
    # Se primeiro argumento nao e target, assume que e versao
    if [ -n "$1" ] && [[ "$1" != --* ]]; then
        VERSION="$1"
        shift
    fi
fi

# Parse de flags adicionais
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-push)
            NO_PUSH=true
            AUTO_PUSH=false
            shift
            ;;
        *)
            log_warning "Flag desconhecida: $1"
            shift
            ;;
    esac
done

# ==========================================
# HEADER
# ==========================================
log_header ""
log_header "╔════════════════════════════════════════════════════════════╗"
log_header "║       🚀 TELEMETRIA PIONEIRA - BUILD IMAGES               ║"
log_header "╚════════════════════════════════════════════════════════════╝"
log_info ""
log_info "Configuracao:"
echo "  • Target: $(echo $BUILD_TARGET | tr '[:lower:]' '[:upper:]')"
echo "  • Versao: $VERSION"
echo "  • Docker User: $DOCKER_USERNAME"
echo "  • Auto Push: $AUTO_PUSH"
log_info ""

# Verificar se esta na raiz do projeto
if [ ! -f "docker-compose.prod.yml" ] && [ ! -f "docker-compose.yml" ]; then
    log_error "Este script deve ser executado da raiz do projeto!"
    exit 1
fi

# ==========================================
# EXECUTAR BUILDS
# ==========================================

BUILD_SUCCESS=true

case $BUILD_TARGET in
    backend)
        log_info "🔧 Buildando apenas BACKEND..."
        log_info ""
        if ! bash "${SCRIPTS_DIR}/build-backend.sh" "$VERSION"; then
            BUILD_SUCCESS=false
        fi
        ;;

    frontend)
        log_info "🎨 Buildando apenas FRONTEND..."
        log_info ""
        if ! bash "${SCRIPTS_DIR}/build-frontend.sh" "$VERSION"; then
            BUILD_SUCCESS=false
        fi
        ;;

    both)
        log_info "📦 Buildando BACKEND + FRONTEND..."
        log_info ""

        # Build backend
        log_header "════════════════════════════════════════════════════════════"
        log_header "  1/2 - BACKEND"
        log_header "════════════════════════════════════════════════════════════"
        echo ""
        if ! bash "${SCRIPTS_DIR}/build-backend.sh" "$VERSION"; then
            BUILD_SUCCESS=false
        fi

        echo ""
        echo ""

        # Build frontend
        log_header "════════════════════════════════════════════════════════════"
        log_header "  2/2 - FRONTEND"
        log_header "════════════════════════════════════════════════════════════"
        echo ""
        if ! bash "${SCRIPTS_DIR}/build-frontend.sh" "$VERSION"; then
            BUILD_SUCCESS=false
        fi
        ;;
esac

# Verificar se build foi bem sucedido
if [ "$BUILD_SUCCESS" = false ]; then
    log_error ""
    log_error "Build falhou! Verifique os erros acima."
    exit 1
fi

# ==========================================
# PUSH (se aplicavel)
# ==========================================
echo ""
log_header "════════════════════════════════════════════════════════════"
log_success "✨ BUILD CONCLUIDO COM SUCESSO!"
log_header "════════════════════════════════════════════════════════════"
echo ""

# Listar imagens criadas
log_info "Imagens criadas:"
if [[ "$BUILD_TARGET" == "backend" ]] || [[ "$BUILD_TARGET" == "both" ]]; then
    echo "  • felipebatista54/telemetria-backend:${VERSION}"
    echo "  • felipebatista54/telemetria-backend:latest"
fi
if [[ "$BUILD_TARGET" == "frontend" ]] || [[ "$BUILD_TARGET" == "both" ]]; then
    echo "  • felipebatista54/telemetria-frontend:${VERSION}"
    echo "  • felipebatista54/telemetria-frontend:latest"
fi
echo ""

# Decidir sobre push
if [ "$NO_PUSH" = true ]; then
    log_info "Push desabilitado (--no-push)."
    echo ""
    log_info "Para fazer push manualmente:"

    if [[ "$BUILD_TARGET" == "backend" ]] || [[ "$BUILD_TARGET" == "both" ]]; then
        echo "  docker push felipebatista54/telemetria-backend:${VERSION}"
        echo "  docker push felipebatista54/telemetria-backend:latest"
    fi

    if [[ "$BUILD_TARGET" == "frontend" ]] || [[ "$BUILD_TARGET" == "both" ]]; then
        echo "  docker push felipebatista54/telemetria-frontend:${VERSION}"
        echo "  docker push felipebatista54/telemetria-frontend:latest"
    fi
elif [ "$AUTO_PUSH" = true ]; then
    log_info "🚀 Fazendo push das imagens..."
    echo ""

    if [[ "$BUILD_TARGET" == "backend" ]] || [[ "$BUILD_TARGET" == "both" ]]; then
        docker push felipebatista54/telemetria-backend:${VERSION}
        docker push felipebatista54/telemetria-backend:latest
    fi

    if [[ "$BUILD_TARGET" == "frontend" ]] || [[ "$BUILD_TARGET" == "both" ]]; then
        docker push felipebatista54/telemetria-frontend:${VERSION}
        docker push felipebatista54/telemetria-frontend:latest
    fi

    log_success "Push realizado com sucesso!"
    echo ""
    log_info "No servidor, execute:"
    echo "  docker pull felipebatista54/telemetria-backend:${VERSION}"
    echo "  docker pull felipebatista54/telemetria-frontend:${VERSION}"
    echo "  docker compose -f docker-compose.prod.yml --env-file .env.production down"
    echo "  docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
fi

echo ""
log_success "✨ Processo finalizado!"
