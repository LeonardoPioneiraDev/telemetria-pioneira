#!/bin/bash

# ==========================================
# 🏗️ BUILD E PUSH - BACKEND DOCKER IMAGE
# ==========================================
# Telemetria Pioneira - Build e Push para DockerHub
#
# Este script faz build da imagem Docker do backend
# e push para o DockerHub
#
# Uso: ./scripts/build-backend.sh [versao]
# Exemplo: ./scripts/build-backend.sh 1.0.0

set -e  # Para em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==========================================
# 📋 CONFIGURAÇÕES
# ==========================================

DOCKERHUB_USER="felipebatista54"
IMAGE_NAME="telemetria-backend"
FULL_IMAGE_NAME="$DOCKERHUB_USER/$IMAGE_NAME"

# Versão (parâmetro ou default)
VERSION=${1:-"latest"}
DOCKERFILE="apps/backend/Dockerfile.prod"

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
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_step() {
    echo -e "\n${YELLOW}➡️  $1${NC}\n"
}

# ==========================================
# 🔍 VERIFICAÇÕES INICIAIS
# ==========================================

print_header "🏗️ BUILD DOCKER - TELEMETRIA BACKEND"

# Verificar se está na raiz do projeto
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
    print_error "Execute este script na raiz do monorepo!"
    exit 1
fi

# Verificar se Dockerfile existe
if [ ! -f "$DOCKERFILE" ]; then
    print_error "Dockerfile não encontrado: $DOCKERFILE"
    exit 1
fi

# Verificar se .dockerignore existe
if [ ! -f "apps/backend/.dockerignore" ]; then
    print_warning ".dockerignore não encontrado em apps/backend/"
    read -p "Continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    print_error "Docker não está rodando! Inicie o Docker Desktop."
    exit 1
fi

print_success "Verificações iniciais OK"

# ==========================================
# 📊 INFORMAÇÕES DO BUILD
# ==========================================

print_header "📊 INFORMAÇÕES DO BUILD"

echo -e "${CYAN}Imagem:${NC} $FULL_IMAGE_NAME"
echo -e "${CYAN}Versão:${NC} $VERSION"
echo -e "${CYAN}Dockerfile:${NC} $DOCKERFILE"
echo -e "${CYAN}Plataforma:${NC} linux/amd64 (servidor Ubuntu)"
echo ""

# Confirmar build
read -p "Deseja continuar com o build? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_info "Build cancelado"
    exit 0
fi

# ==========================================
# 🧹 LIMPEZA PRÉ-BUILD
# ==========================================

print_header "🧹 LIMPEZA PRÉ-BUILD"

print_step "Limpando build anterior do backend..."
cd apps/backend
if [ -d "dist" ]; then
    rm -rf dist
    print_success "Pasta dist removida"
fi
cd ../..

print_step "Removendo imagens antigas (se existirem)..."
docker rmi "$FULL_IMAGE_NAME:$VERSION" 2>/dev/null || true
docker rmi "$FULL_IMAGE_NAME:latest" 2>/dev/null || true
print_success "Limpeza concluída"

# ==========================================
# 🏗️ BUILD DA IMAGEM
# ==========================================

print_header "🏗️ CONSTRUINDO IMAGEM DOCKER"

print_step "Iniciando build..."
echo -e "${YELLOW}Isso pode levar alguns minutos...${NC}\n"

# Build com progress interativo
docker build \
    -f "$DOCKERFILE" \
    -t "$FULL_IMAGE_NAME:$VERSION" \
    -t "$FULL_IMAGE_NAME:latest" \
    --platform linux/amd64 \
    --progress=plain \
    . 2>&1 | while IFS= read -r line; do
        echo -e "${CYAN}${line}${NC}"
    done

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_success "Build concluído com sucesso!"
else
    print_error "Falha no build!"
    exit 1
fi

# ==========================================
# 📊 INFORMAÇÕES DA IMAGEM
# ==========================================

print_header "📊 INFORMAÇÕES DA IMAGEM"

# Obter tamanho da imagem
IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME:$VERSION" --format "{{.Size}}")
IMAGE_ID=$(docker images "$FULL_IMAGE_NAME:$VERSION" --format "{{.ID}}")

echo -e "${GREEN}ID da Imagem:${NC} $IMAGE_ID"
echo -e "${GREEN}Tamanho:${NC} $IMAGE_SIZE"
echo -e "${GREEN}Tags:${NC} $VERSION, latest"
echo ""

# ==========================================
# 🧪 TESTE RÁPIDO DA IMAGEM
# ==========================================

print_header "🧪 TESTANDO IMAGEM"

print_step "Verificando se a imagem inicia corretamente..."

# Testar se o node funciona
if docker run --rm "$FULL_IMAGE_NAME:$VERSION" node --version > /dev/null 2>&1; then
    NODE_VERSION=$(docker run --rm "$FULL_IMAGE_NAME:$VERSION" node --version)
    print_success "Node.js: $NODE_VERSION"
else
    print_error "Falha ao executar node na imagem!"
    exit 1
fi

# Verificar se dist existe
if docker run --rm "$FULL_IMAGE_NAME:$VERSION" ls dist/server.js > /dev/null 2>&1; then
    print_success "Arquivo dist/server.js encontrado"
else
    print_error "Arquivo dist/server.js não encontrado!"
    exit 1
fi

# Verificar se templates existem
if docker run --rm "$FULL_IMAGE_NAME:$VERSION" ls src/templates > /dev/null 2>&1; then
    print_success "Templates de email encontrados"
else
    print_warning "Templates de email não encontrados (podem ser necessários)"
fi

print_success "Testes básicos passaram!"

# ==========================================
# 🚀 PUSH PARA DOCKERHUB
# ==========================================

print_header "🚀 PUSH PARA DOCKERHUB"

print_warning "Você precisa estar logado no DockerHub"
print_info "Se não estiver logado, execute: docker login"
echo ""

read -p "Deseja fazer push para o DockerHub agora? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_info "Push cancelado. Imagem local pronta para uso."
    print_info "Para fazer push depois: docker push $FULL_IMAGE_NAME:$VERSION"
    exit 0
fi

# Verificar login no Docker
print_step "Verificando login no DockerHub..."
if docker info 2>/dev/null | grep -q "Username: $DOCKERHUB_USER"; then
    print_success "Logado como: $DOCKERHUB_USER"
elif docker info 2>/dev/null | grep -q "Username:"; then
    CURRENT_USER=$(docker info 2>/dev/null | grep "Username:" | awk '{print $2}')
    print_warning "Logado como: $CURRENT_USER (esperado: $DOCKERHUB_USER)"
    print_error "Faça login com o usuário correto: docker login"
    exit 1
else
    print_error "Não está logado no DockerHub!"
    print_info "Execute: docker login"
    exit 1
fi

# Push da versão específica
print_step "Fazendo push da versão $VERSION..."
docker push "$FULL_IMAGE_NAME:$VERSION"
print_success "Push concluído: $FULL_IMAGE_NAME:$VERSION"

# Push da tag latest
print_step "Fazendo push da tag latest..."
docker push "$FULL_IMAGE_NAME:latest"
print_success "Push concluído: $FULL_IMAGE_NAME:latest"

# ==========================================
# 📋 RESUMO FINAL
# ==========================================

print_header "🎉 BUILD E PUSH CONCLUÍDOS"

echo -e "${GREEN}✅ Imagem construída com sucesso${NC}"
echo -e "${GREEN}✅ Push realizado para DockerHub${NC}"
echo ""
echo -e "${CYAN}Imagem:${NC} $FULL_IMAGE_NAME"
echo -e "${CYAN}Tags disponíveis:${NC}"
echo -e "   - $FULL_IMAGE_NAME:$VERSION"
echo -e "   - $FULL_IMAGE_NAME:latest"
echo -e "${CYAN}Tamanho:${NC} $IMAGE_SIZE"
echo ""
echo -e "${YELLOW}🔗 DockerHub:${NC} https://hub.docker.com/r/$DOCKERHUB_USER/$IMAGE_NAME"
echo ""

# ==========================================
# 📝 PRÓXIMOS PASSOS
# ==========================================

print_header "📝 PRÓXIMOS PASSOS NO SERVIDOR"

echo -e "${YELLOW}No servidor Ubuntu, execute:${NC}\n"

echo "1. Fazer pull da imagem:"
echo -e "   ${CYAN}docker pull $FULL_IMAGE_NAME:$VERSION${NC}"
echo ""

echo "2. Subir os containers:"
echo -e "   ${CYAN}docker-compose -f docker-compose.prod.yml up -d${NC}"
echo ""

echo "3. Verificar logs:"
echo -e "   ${CYAN}docker logs -f telemetria-backend${NC}"
echo ""

echo "4. Verificar health:"
echo -e "   ${CYAN}curl http://localhost:3007/health${NC}"
echo ""

print_success "Build finalizado com sucesso! 🚀"
echo ""