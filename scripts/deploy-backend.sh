#!/bin/bash

# ==========================================
# 🚀 DEPLOY - BACKEND NO SERVIDOR UBUNTU
# ==========================================
# Telemetria Pioneira - Deploy em Produção
#
# Este script deve ser executado NO SERVIDOR UBUNTU
# para fazer deploy do backend
#
# Uso: ./scripts/deploy-backend.sh [versao]
# Exemplo: ./scripts/deploy-backend.sh 1.0.0

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

# Versão (parâmetro ou latest)
VERSION=${1:-"latest"}
COMPOSE_FILE="docker-compose.prod.yml"

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

# Função para verificar se container está saudável
check_health() {
    local container_name=$1
    local max_attempts=30
    local attempt=1

    echo -e "${CYAN}Aguardando $container_name ficar saudável...${NC}"

    while [ $attempt -le $max_attempts ]; do
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health")
        
        if [ "$health_status" = "healthy" ]; then
            print_success "$container_name está saudável!"
            return 0
        elif [ "$health_status" = "unhealthy" ]; then
            print_error "$container_name está unhealthy!"
            return 1
        fi
        
        echo -ne "${CYAN}Tentativa $attempt/$max_attempts - Status: $health_status${NC}\r"
        sleep 2
        ((attempt++))
    done

    echo ""
    print_error "$container_name não ficou saudável após $max_attempts tentativas"
    return 1
}

# ==========================================
# 🔍 VERIFICAÇÕES INICIAIS
# ==========================================

print_header "🚀 DEPLOY BACKEND - TELEMETRIA PIONEIRA"

# Verificar se está na raiz do projeto
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Arquivo $COMPOSE_FILE não encontrado!"
    print_info "Execute este script na raiz do projeto no servidor"
    exit 1
fi

# Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
    print_error "Arquivo .env.production não encontrado!"
    print_info "Crie o arquivo .env.production antes de fazer deploy"
    print_info "Use o template: .env.production.example"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    print_error "Docker não está rodando!"
    exit 1
fi

# Verificar se docker-compose está instalado
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose não está instalado!"
    print_info "Instale com: sudo apt-get install docker-compose"
    exit 1
fi

print_success "Verificações iniciais OK"

# ==========================================
# 📊 INFORMAÇÕES DO DEPLOY
# ==========================================

print_header "📊 INFORMAÇÕES DO DEPLOY"

echo -e "${CYAN}Imagem:${NC} $FULL_IMAGE_NAME:$VERSION"
echo -e "${CYAN}Compose File:${NC} $COMPOSE_FILE"
echo -e "${CYAN}Ambiente:${NC} Produção (Ubuntu)"
echo ""

# Listar containers atuais
print_info "Containers atuais do Telemetria:"
docker ps -a --filter "name=telemetria-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
echo ""

# Confirmar deploy
read -p "Deseja continuar com o deploy? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_info "Deploy cancelado"
    exit 0
fi

# ==========================================
# 📥 PULL DA IMAGEM
# ==========================================

print_header "📥 BAIXANDO IMAGEM DO DOCKERHUB"

print_step "Fazendo pull da imagem $FULL_IMAGE_NAME:$VERSION..."

if docker pull "$FULL_IMAGE_NAME:$VERSION"; then
    print_success "Imagem baixada com sucesso!"
    
    # Exibir informações da imagem
    IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME:$VERSION" --format "{{.Size}}")
    IMAGE_ID=$(docker images "$FULL_IMAGE_NAME:$VERSION" --format "{{.ID}}")
    echo -e "${GREEN}ID:${NC} $IMAGE_ID"
    echo -e "${GREEN}Tamanho:${NC} $IMAGE_SIZE"
else
    print_error "Falha ao baixar imagem!"
    print_info "Verifique se a imagem existe no DockerHub"
    exit 1
fi

# ==========================================
# 🛑 PARANDO CONTAINERS ANTIGOS
# ==========================================

print_header "🛑 PARANDO CONTAINERS ANTIGOS"

print_step "Parando containers do Telemetria..."

# Parar e remover containers antigos (mantém volumes)
docker-compose -f "$COMPOSE_FILE" --env-file .env.production down

print_success "Containers antigos removidos"

# ==========================================
# 🚀 INICIANDO NOVOS CONTAINERS
# ==========================================

print_header "🚀 INICIANDO CONTAINERS"

print_step "Subindo containers em modo detached..."

# Carregar variáveis do .env.production
export $(grep -v '^#' .env.production | xargs)

# Subir containers
docker-compose -f "$COMPOSE_FILE" --env-file .env.production up -d

print_success "Containers iniciados!"

# ==========================================
# 🏥 VERIFICANDO HEALTH CHECKS
# ==========================================

print_header "🏥 VERIFICANDO SAÚDE DOS CONTAINERS"

echo -e "${CYAN}Aguarde alguns segundos para os containers iniciarem...${NC}"
sleep 5

# Verificar PostgreSQL
print_step "Verificando PostgreSQL..."
if check_health "telemetria-postgres"; then
    print_success "PostgreSQL OK"
else
    print_error "PostgreSQL falhou!"
    print_info "Verifique logs: docker logs telemetria-postgres"
    exit 1
fi

# Verificar Redis
print_step "Verificando Redis..."
if check_health "telemetria-redis"; then
    print_success "Redis OK"
else
    print_error "Redis falhou!"
    print_info "Verifique logs: docker logs telemetria-redis"
    exit 1
fi

# Verificar Backend
print_step "Verificando Backend API..."
if check_health "telemetria-backend"; then
    print_success "Backend API OK"
else
    print_error "Backend API falhou!"
    print_info "Verifique logs: docker logs telemetria-backend"
    exit 1
fi

# Verificar Worker (não tem health check tradicional)
print_step "Verificando Worker Events..."
if docker ps --filter "name=telemetria-worker-events" --filter "status=running" | grep -q telemetria-worker-events; then
    print_success "Worker Events rodando"
else
    print_warning "Worker Events pode não estar rodando corretamente"
    print_info "Verifique logs: docker logs telemetria-worker-events"
fi

# ==========================================
# 🧪 TESTANDO ENDPOINTS
# ==========================================

print_header "🧪 TESTANDO ENDPOINTS"

print_step "Testando endpoint de health..."

# Aguardar um pouco mais para garantir que API está pronta
sleep 5

# Testar health endpoint
if curl -f -s http://localhost:3007/health > /dev/null; then
    print_success "Endpoint /health respondeu com sucesso!"
    
    # Exibir resposta do health
    echo -e "\n${CYAN}Resposta do health check:${NC}"
    curl -s http://localhost:3007/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3007/health
    echo ""
else
    print_warning "Endpoint /health não respondeu"
    print_info "Verifique os logs do backend"
fi

# ==========================================
# 📊 STATUS FINAL DOS CONTAINERS
# ==========================================

print_header "📊 STATUS DOS CONTAINERS"

docker-compose -f "$COMPOSE_FILE" --env-file .env.production ps

# ==========================================
# 📝 INFORMAÇÕES ÚTEIS
# ==========================================

print_header "📝 INFORMAÇÕES ÚTEIS"

echo -e "${GREEN}Portas expostas:${NC}"
echo -e "  🗄️  PostgreSQL: ${CYAN}localhost:5437${NC}"
echo -e "  🔴 Redis:      ${CYAN}localhost:6381${NC}"
echo -e "  🚀 Backend:    ${CYAN}localhost:3007${NC}"
echo ""

echo -e "${GREEN}URLs da API:${NC}"
echo -e "  💚 Health:     ${CYAN}http://localhost:3007/health${NC}"
echo -e "  🔐 Auth:       ${CYAN}http://localhost:3007/api/auth${NC}"
echo ""

echo -e "${GREEN}Comandos úteis:${NC}"
echo -e "  📊 Ver logs do backend:"
echo -e "     ${CYAN}docker logs -f telemetria-backend${NC}"
echo ""
echo -e "  📊 Ver logs do worker:"
echo -e "     ${CYAN}docker logs -f telemetria-worker-events${NC}"
echo ""
echo -e "  📊 Ver todos os logs:"
echo -e "     ${CYAN}docker-compose -f $COMPOSE_FILE logs -f${NC}"
echo ""
echo -e "  🔄 Reiniciar backend:"
echo -e "     ${CYAN}docker-compose -f $COMPOSE_FILE restart telemetria-backend${NC}"
echo ""
echo -e "  🛑 Parar tudo:"
echo -e "     ${CYAN}docker-compose -f $COMPOSE_FILE down${NC}"
echo ""
echo -e "  📊 Status dos containers:"
echo -e "     ${CYAN}docker-compose -f $COMPOSE_FILE ps${NC}"
echo ""

# ==========================================
# 📋 RESUMO FINAL
# ==========================================

print_header "🎉 DEPLOY CONCLUÍDO"

print_success "Backend deployado com sucesso!"
print_success "Todos os serviços estão rodando"
print_info "Monitore os logs para garantir que tudo está funcionando"

echo -e "\n${YELLOW}Próximos passos:${NC}"
echo "1. Verifique os logs: docker logs -f telemetria-backend"
echo "2. Teste a API: curl http://localhost:3007/health"
echo "3. Configure o frontend para apontar para a API"
echo "4. Configure SSL/HTTPS (se necessário)"
echo ""

print_success "Deploy finalizado! 🚀"
echo ""