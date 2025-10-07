#!/bin/bash

# ==========================================
# 🔄 RESTORE DO POSTGRESQL
# ==========================================
# Telemetria Pioneira - Restore do Banco de Dados
#
# Este script restaura backup do PostgreSQL rodando no Docker
# Pode ser executado tanto no Mac (dev) quanto no Ubuntu (prod)
#
# Uso: ./scripts/db-restore.sh [ambiente] [arquivo_backup]
# Exemplo: ./scripts/db-restore.sh prod telemetria_backup_prod_20250107_143022.sql.gz

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

# Ambiente (dev ou prod)
ENVIRONMENT=${1:-"dev"}
BACKUP_FILE_NAME=${2:-""}

# Configurações por ambiente
if [ "$ENVIRONMENT" = "prod" ]; then
    CONTAINER_NAME="telemetria-postgres"
    DB_USER="telemetria_prod"
    DB_NAME="telemetriaPioneira_db"
    BACKUP_DIR="backups/postgres/prod"
    BACKEND_CONTAINER="telemetria-backend"
    WORKER_CONTAINER="telemetria-worker-events"
else
    CONTAINER_NAME="telemetria-postgres"
    DB_USER="telemetria"
    DB_NAME="telemetriaPioneira_db"
    BACKUP_DIR="backups/postgres/dev"
    BACKEND_CONTAINER="telemetria-backend"
    WORKER_CONTAINER=""
fi

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

# Função para formatar tamanho de arquivo
format_size() {
    local size=$1
    if [ $size -lt 1024 ]; then
        echo "${size}B"
    elif [ $size -lt 1048576 ]; then
        echo "$(( size / 1024 ))KB"
    else
        echo "$(( size / 1048576 ))MB"
    fi
}

# ==========================================
# 🔍 VERIFICAÇÕES INICIAIS
# ==========================================

print_header "🔄 RESTORE DO POSTGRESQL - TELEMETRIA PIONEIRA"

echo -e "${CYAN}Ambiente:${NC} $ENVIRONMENT"
echo -e "${CYAN}Container:${NC} $CONTAINER_NAME"
echo -e "${CYAN}Banco:${NC} $DB_NAME"
echo -e "${CYAN}Usuário:${NC} $DB_USER"
echo ""

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    print_error "Docker não está rodando!"
    exit 1
fi

# Verificar se container existe e está rodando
if ! docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" | grep -q "$CONTAINER_NAME"; then
    print_error "Container $CONTAINER_NAME não está rodando!"
    print_info "Verifique com: docker ps -a"
    exit 1
fi

print_success "Verificações iniciais OK"

# ==========================================
# 📁 SELECIONAR ARQUIVO DE BACKUP
# ==========================================

print_header "📁 SELECIONANDO ARQUIVO DE BACKUP"

# Se não foi passado arquivo, listar disponíveis
if [ -z "$BACKUP_FILE_NAME" ]; then
    echo -e "${CYAN}Backups disponíveis em $BACKUP_DIR:${NC}\n"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.sql.gz 2>/dev/null)" ]; then
        print_error "Nenhum backup encontrado em $BACKUP_DIR"
        print_info "Execute primeiro: ./scripts/db-backup.sh $ENVIRONMENT"
        exit 1
    fi
    
    # Listar backups numerados
    index=1
    while IFS= read -r backup; do
        backup_name=$(basename "$backup")
        backup_size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null)
        backup_size_formatted=$(format_size $backup_size)
        backup_date=$(date -r "$backup" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -d "@$(stat -c%Y "$backup")" "+%Y-%m-%d %H:%M:%S" 2>/dev/null)
        echo -e "${GREEN}[$index]${NC} $backup_name - $backup_size_formatted - $backup_date"
        ((index++))
    done < <(ls -t "$BACKUP_DIR"/*.sql.gz)
    
    echo ""
    read -p "Digite o número do backup (ou 0 para cancelar): " backup_choice
    
    if [ "$backup_choice" = "0" ] || [ -z "$backup_choice" ]; then
        print_info "Restore cancelado"
        exit 0
    fi
    
    # Obter arquivo selecionado
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz | sed -n "${backup_choice}p")
    
    if [ -z "$BACKUP_FILE" ]; then
        print_error "Seleção inválida!"
        exit 1
    fi
else
    # Arquivo foi passado como parâmetro
    if [[ "$BACKUP_FILE_NAME" == /* ]]; then
        # Caminho absoluto
        BACKUP_FILE="$BACKUP_FILE_NAME"
    else
        # Caminho relativo ao diretório de backups
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE_NAME"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Arquivo de backup não encontrado: $BACKUP_FILE"
        exit 1
    fi
fi

print_success "Backup selecionado: $(basename "$BACKUP_FILE")"

# ==========================================
# 🔐 VERIFICAR INTEGRIDADE DO BACKUP
# ==========================================

print_header "🔐 VERIFICANDO INTEGRIDADE DO BACKUP"

HASH_FILE="${BACKUP_FILE}.sha256"

if [ -f "$HASH_FILE" ]; then
    print_step "Verificando hash SHA256..."
    
    if (cd "$(dirname "$BACKUP_FILE")" && shasum -a 256 -c "$(basename "$HASH_FILE")" > /dev/null 2>&1); then
        print_success "Integridade do backup verificada (SHA256 OK)"
    else
        print_error "Integridade do backup falhou!"
        print_warning "O arquivo pode estar corrompido"
        read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "Arquivo de hash não encontrado - pulando verificação"
fi

# ==========================================
# ⚠️ CONFIRMAÇÃO FINAL
# ==========================================

print_header "⚠️  ATENÇÃO - CONFIRMAÇÃO NECESSÁRIA"

echo -e "${RED}ATENÇÃO: Esta operação vai SOBRESCREVER todos os dados do banco!${NC}"
echo -e "${RED}Todos os dados atuais serão perdidos!${NC}"
echo ""
echo -e "${CYAN}Ambiente:${NC} $ENVIRONMENT"
echo -e "${CYAN}Banco:${NC} $DB_NAME"
echo -e "${CYAN}Backup:${NC} $(basename "$BACKUP_FILE")"
echo ""

read -p "Digite 'CONFIRMAR' para continuar: " confirmation

if [ "$confirmation" != "CONFIRMAR" ]; then
    print_info "Restore cancelado"
    exit 0
fi

# ==========================================
# 🛑 PARAR APLICAÇÃO
# ==========================================

print_header "🛑 PARANDO APLICAÇÃO"

# Parar backend
if docker ps --filter "name=$BACKEND_CONTAINER" --filter "status=running" | grep -q "$BACKEND_CONTAINER"; then
    print_step "Parando backend..."
    docker stop "$BACKEND_CONTAINER" > /dev/null 2>&1
    print_success "Backend parado"
else
    print_info "Backend não está rodando"
fi

# Parar worker (se existir em produção)
if [ -n "$WORKER_CONTAINER" ] && docker ps --filter "name=$WORKER_CONTAINER" --filter "status=running" | grep -q "$WORKER_CONTAINER"; then
    print_step "Parando worker..."
    docker stop "$WORKER_CONTAINER" > /dev/null 2>&1
    print_success "Worker parado"
fi

# ==========================================
# 📊 BACKUP PRÉ-RESTORE (SEGURANÇA)
# ==========================================

print_header "📊 CRIANDO BACKUP DE SEGURANÇA"

print_step "Criando backup automático antes do restore..."

PRE_RESTORE_BACKUP_DIR="$BACKUP_DIR/pre-restore"
mkdir -p "$PRE_RESTORE_BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_FILE="$PRE_RESTORE_BACKUP_DIR/pre_restore_backup_${TIMESTAMP}.sql.gz"

docker exec "$CONTAINER_NAME" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    2>/dev/null | gzip > "$PRE_RESTORE_FILE"

if [ -f "$PRE_RESTORE_FILE" ]; then
    PRE_RESTORE_SIZE=$(stat -f%z "$PRE_RESTORE_FILE" 2>/dev/null || stat -c%s "$PRE_RESTORE_FILE" 2>/dev/null)
    print_success "Backup de segurança criado: $(format_size $PRE_RESTORE_SIZE)"
else
    print_warning "Não foi possível criar backup de segurança"
fi

# ==========================================
# 🗜️ DESCOMPRIMIR BACKUP
# ==========================================

print_header "🗜️ DESCOMPRIMINDO BACKUP"

print_step "Descompactando arquivo..."

TEMP_SQL_FILE="/tmp/telemetria_restore_${TIMESTAMP}.sql"

gunzip -c "$BACKUP_FILE" > "$TEMP_SQL_FILE"

if [ ! -f "$TEMP_SQL_FILE" ]; then
    print_error "Falha ao descomprimir backup!"
    exit 1
fi

TEMP_SIZE=$(stat -f%z "$TEMP_SQL_FILE" 2>/dev/null || stat -c%s "$TEMP_SQL_FILE" 2>/dev/null)
print_success "Arquivo descomprimido: $(format_size $TEMP_SIZE)"

# ==========================================
# 🔄 RESTAURAR BANCO DE DADOS
# ==========================================

print_header "🔄 RESTAURANDO BANCO DE DADOS"

print_step "Executando restore com psql..."
echo -e "${CYAN}Isso pode levar alguns minutos...${NC}\n"

# Restaurar usando psql
docker exec -i "$CONTAINER_NAME" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    < "$TEMP_SQL_FILE" 2>&1 | while IFS= read -r line; do
        if [[ $line == *"ERROR"* ]]; then
            echo -e "${RED}${line}${NC}"
        else
            echo -e "${CYAN}${line}${NC}"
        fi
    done

print_success "Restore concluído!"

# Limpar arquivo temporário
rm -f "$TEMP_SQL_FILE"
print_success "Arquivo temporário removido"

# ==========================================
# 📊 VERIFICAR RESTORE
# ==========================================

print_header "📊 VERIFICANDO RESTORE"

print_step "Coletando estatísticas do banco..."

# Número de tabelas
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo -e "${GREEN}Tabelas restauradas:${NC} $TABLE_COUNT"

# Tamanho do banco
DB_SIZE=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
echo -e "${GREEN}Tamanho do banco:${NC} $DB_SIZE"

# Última atualização (se tabela de controle existir)
LAST_UPDATE=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT MAX(updated_at) FROM telemetry_events;" 2>/dev/null | xargs || echo "N/A")
echo -e "${GREEN}Último registro:${NC} $LAST_UPDATE"

echo ""

# ==========================================
# 🚀 REINICIAR APLICAÇÃO
# ==========================================

print_header "🚀 REINICIANDO APLICAÇÃO"

# Reiniciar backend
if docker ps -a --filter "name=$BACKEND_CONTAINER" | grep -q "$BACKEND_CONTAINER"; then
    print_step "Reiniciando backend..."
    docker start "$BACKEND_CONTAINER" > /dev/null 2>&1
    print_success "Backend reiniciado"
    
    # Aguardar alguns segundos
    sleep 5
    
    # Verificar se está rodando
    if docker ps --filter "name=$BACKEND_CONTAINER" --filter "status=running" | grep -q "$BACKEND_CONTAINER"; then
        print_success "Backend está rodando"
    else
        print_warning "Backend pode não estar rodando corretamente"
    fi
fi

# Reiniciar worker (se existir)
if [ -n "$WORKER_CONTAINER" ] && docker ps -a --filter "name=$WORKER_CONTAINER" | grep -q "$WORKER_CONTAINER"; then
    print_step "Reiniciando worker..."
    docker start "$WORKER_CONTAINER" > /dev/null 2>&1
    print_success "Worker reiniciado"
fi

# ==========================================
# 📝 RESUMO FINAL
# ==========================================

print_header "🎉 RESTORE CONCLUÍDO COM SUCESSO"

echo -e "${GREEN}✅ Backup restaurado com sucesso${NC}"
echo -e "${GREEN}✅ Backup de segurança criado${NC}"
echo -e "${GREEN}✅ Aplicação reiniciada${NC}"
echo ""

echo -e "${CYAN}Informações do restore:${NC}"
echo -e "  📁 Backup usado: $(basename "$BACKUP_FILE")"
echo -e "  📊 Tabelas: $TABLE_COUNT"
echo -e "  💾 Tamanho: $DB_SIZE"
echo -e "  🔐 Backup de segurança: $(basename "$PRE_RESTORE_FILE")"
echo ""

echo -e "${YELLOW}Recomendações:${NC}"
echo "1. Verifique os logs do backend: docker logs -f $BACKEND_CONTAINER"
echo "2. Teste a aplicação para garantir que tudo está funcionando"
echo "3. Se houver problemas, você pode restaurar o backup de segurança"
echo ""

print_success "Restore finalizado! 🔄"
echo ""