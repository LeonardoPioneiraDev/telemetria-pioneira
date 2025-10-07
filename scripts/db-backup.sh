#!/bin/bash

# ==========================================
# 💾 BACKUP DO POSTGRESQL
# ==========================================
# Telemetria Pioneira - Backup do Banco de Dados
#
# Este script cria backup do PostgreSQL rodando no Docker
# Pode ser executado tanto no Mac (dev) quanto no Ubuntu (prod)
#
# Uso: ./scripts/db-backup.sh [ambiente]
# Exemplo: ./scripts/db-backup.sh dev
#          ./scripts/db-backup.sh prod

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

# Configurações por ambiente
if [ "$ENVIRONMENT" = "prod" ]; then
    CONTAINER_NAME="telemetria-postgres"
    DB_USER="telemetria_prod"
    DB_NAME="telemetriaPioneira_db"
    BACKUP_DIR="backups/postgres/prod"
else
    CONTAINER_NAME="telemetria-postgres"
    DB_USER="telemetria"
    DB_NAME="telemetriaPioneira_db"
    BACKUP_DIR="backups/postgres/dev"
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

print_header "💾 BACKUP DO POSTGRESQL - TELEMETRIA PIONEIRA"

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
# 📁 PREPARAR DIRETÓRIO DE BACKUP
# ==========================================

print_header "📁 PREPARANDO DIRETÓRIO DE BACKUP"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"
print_success "Diretório de backup: $BACKUP_DIR"

# Gerar nome do arquivo com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/telemetria_backup_${ENVIRONMENT}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo -e "${CYAN}Arquivo de backup:${NC} $BACKUP_FILE_GZ"
echo ""

# ==========================================
# 💾 CRIAR BACKUP
# ==========================================

print_header "💾 CRIANDO BACKUP DO BANCO DE DADOS"

print_step "Executando pg_dump..."
echo -e "${CYAN}Isso pode levar alguns minutos dependendo do tamanho do banco...${NC}\n"

# Criar backup usando pg_dump
docker exec "$CONTAINER_NAME" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_FILE" 2>&1 | while IFS= read -r line; do
        if [[ $line == *"ERROR"* ]]; then
            echo -e "${RED}${line}${NC}"
        else
            echo -e "${CYAN}${line}${NC}"
        fi
    done

# Verificar se o backup foi criado
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Falha ao criar backup!"
    exit 1
fi

# Obter tamanho do arquivo
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
BACKUP_SIZE_FORMATTED=$(format_size $BACKUP_SIZE)

print_success "Backup criado: $BACKUP_SIZE_FORMATTED"

# ==========================================
# 🗜️ COMPRIMIR BACKUP
# ==========================================

print_header "🗜️ COMPRIMINDO BACKUP"

print_step "Compactando arquivo SQL com gzip..."

gzip -f "$BACKUP_FILE"

if [ ! -f "$BACKUP_FILE_GZ" ]; then
    print_error "Falha ao comprimir backup!"
    exit 1
fi

# Obter tamanho do arquivo comprimido
COMPRESSED_SIZE=$(stat -f%z "$BACKUP_FILE_GZ" 2>/dev/null || stat -c%s "$BACKUP_FILE_GZ" 2>/dev/null)
COMPRESSED_SIZE_FORMATTED=$(format_size $COMPRESSED_SIZE)

# Calcular taxa de compressão
COMPRESSION_RATIO=$(( 100 - (COMPRESSED_SIZE * 100 / BACKUP_SIZE) ))

print_success "Backup comprimido: $COMPRESSED_SIZE_FORMATTED"
print_info "Taxa de compressão: ${COMPRESSION_RATIO}%"

# ==========================================
# 🧹 LIMPEZA DE BACKUPS ANTIGOS
# ==========================================

print_header "🧹 LIMPEZA DE BACKUPS ANTIGOS"

# Manter apenas os últimos 7 backups
print_step "Mantendo apenas os 7 backups mais recentes..."

# Contar backups existentes
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l | tr -d ' ')

if [ "$BACKUP_COUNT" -gt 7 ]; then
    # Remover backups antigos (manter os 7 mais recentes)
    ls -1t "$BACKUP_DIR"/*.sql.gz | tail -n +8 | while read -r old_backup; do
        echo -e "${YELLOW}Removendo: $(basename "$old_backup")${NC}"
        rm -f "$old_backup"
    done
    
    REMOVED_COUNT=$(( BACKUP_COUNT - 7 ))
    print_success "Removidos $REMOVED_COUNT backups antigos"
else
    print_info "Total de backups: $BACKUP_COUNT (nenhum removido)"
fi

# ==========================================
# 📊 INFORMAÇÕES DO BANCO
# ==========================================

print_header "📊 INFORMAÇÕES DO BANCO DE DADOS"

# Obter informações do banco
echo -e "${CYAN}Coletando estatísticas do banco...${NC}\n"

# Tamanho do banco
DB_SIZE=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
echo -e "${GREEN}Tamanho do banco:${NC} $DB_SIZE"

# Número de tabelas
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo -e "${GREEN}Número de tabelas:${NC} $TABLE_COUNT"

# Versão do PostgreSQL
PG_VERSION=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -n1 | xargs)
echo -e "${GREEN}Versão do PostgreSQL:${NC} $PG_VERSION"

echo ""

# ==========================================
# 📋 LISTAR BACKUPS EXISTENTES
# ==========================================

print_header "📋 BACKUPS EXISTENTES"

echo -e "${CYAN}Backups em $BACKUP_DIR:${NC}\n"

ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | while read -r line; do
    echo -e "${GREEN}$line${NC}"
done || print_info "Nenhum backup encontrado"

echo ""

# ==========================================
# 🔐 INFORMAÇÕES DE SEGURANÇA
# ==========================================

print_header "🔐 INFORMAÇÕES DE SEGURANÇA"

# Calcular hash SHA256 do backup
print_step "Calculando hash SHA256 do backup..."
BACKUP_HASH=$(shasum -a 256 "$BACKUP_FILE_GZ" | awk '{print $1}')
echo -e "${GREEN}SHA256:${NC} $BACKUP_HASH"

# Salvar hash em arquivo
echo "$BACKUP_HASH  $(basename "$BACKUP_FILE_GZ")" > "${BACKUP_FILE_GZ}.sha256"
print_success "Hash salvo em: ${BACKUP_FILE_GZ}.sha256"

echo ""

# ==========================================
# 📝 RESUMO FINAL
# ==========================================

print_header "🎉 BACKUP CONCLUÍDO COM SUCESSO"

echo -e "${GREEN}✅ Backup criado e comprimido${NC}"
echo -e "${GREEN}✅ Backups antigos limpos${NC}"
echo -e "${GREEN}✅ Hash de segurança gerado${NC}"
echo ""

echo -e "${CYAN}Arquivo de backup:${NC}"
echo -e "  📁 Local: $BACKUP_FILE_GZ"
echo -e "  📊 Tamanho original: $BACKUP_SIZE_FORMATTED"
echo -e "  🗜️  Tamanho comprimido: $COMPRESSED_SIZE_FORMATTED"
echo -e "  🔐 Hash: $BACKUP_HASH"
echo ""

echo -e "${YELLOW}Para restaurar este backup:${NC}"
echo -e "  ${CYAN}./scripts/db-restore.sh $ENVIRONMENT $(basename "$BACKUP_FILE_GZ")${NC}"
echo ""

echo -e "${YELLOW}Para transferir para outro servidor:${NC}"
echo -e "  ${CYAN}scp $BACKUP_FILE_GZ usuario@servidor:/path/to/backups/${NC}"
echo ""

print_success "Backup finalizado! 💾"
echo ""