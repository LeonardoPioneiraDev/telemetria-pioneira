# 🚀 Deploy do Backend - Telemetria Pioneira

Guia completo para deploy do backend em produção (servidor Ubuntu).

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Build e Push (Mac)](#build-e-push-mac)
4. [Deploy no Servidor (Ubuntu)](#deploy-no-servidor-ubuntu)
5. [Migração de Dados](#migração-de-dados)
6. [Monitoramento](#monitoramento)
7. [Troubleshooting](#troubleshooting)
8. [Comandos Úteis](#comandos-úteis)

---

## 🔧 Pré-requisitos

### No Mac (Desenvolvimento)

- ✅ Docker Desktop instalado e rodando
- ✅ pnpm 8.15.0+
- ✅ Node.js 18+
- ✅ Conta no DockerHub (felipebatista54)
- ✅ Git

### No Servidor Ubuntu (Produção)

- ✅ Docker instalado
- ✅ Docker Compose instalado
- ✅ Git
- ✅ Portas disponíveis: 3007 (API), 5437 (PostgreSQL), 6381 (Redis)
- ✅ Acesso SSH ao servidor
- ✅ Usuário com permissões Docker

---

## ⚙️ Configuração Inicial

### 1. Preparar Ambiente Local (Mac)

```bash
# 1. Clonar repositório (se ainda não tem)
git clone <url-do-repo>
cd telemetria-pioneira

# 2. Instalar dependências
pnpm install

# 3. Criar arquivos de configuração
mkdir -p scripts backups/postgres/{dev,prod}

# 4. Dar permissões aos scripts
chmod +x scripts/*.sh
```

### 2. Gerar Secrets de Produção

```bash
# Executar gerador de secrets
./scripts/generate-secrets.sh

# Isso vai criar:
# - .env.production com secrets seguros
# - backups/env/secrets.TIMESTAMP.txt com cópia dos secrets
```

### 3. Configurar .env.production

Edite o arquivo `.env.production` e configure:

```bash
# Editar arquivo
nano .env.production

# Configurar manualmente:
# 1. SMTP_PASS - Senha real do email
# 2. MIX_PASSWORD - Senha da API MIX Telematics
# 3. MIX_BASIC_AUTH_TOKEN - Token da API MIX
# 4. CORS_ORIGIN - https://telemetria.vpioneira.com.br
```

**⚠️ IMPORTANTE:** Salve uma cópia segura dos secrets em local protegido!

### 4. Verificar Configurações

```bash
# Verificar se .env.production está correto
cat .env.production | grep "<GERAR_"

# Se aparecer algum <GERAR_*>, você esqueceu de configurar algo!
```

---

## 🏗️ Build e Push (Mac)

### 1. Login no DockerHub

```bash
# Fazer login (uma vez)
docker login

# Verificar login
docker info | grep Username
# Deve mostrar: Username: felipebatista54
```

### 2. Build Local (Teste)

```bash
# Build de teste
docker build -f apps/backend/Dockerfile.prod -t telemetria-backend:test .

# Testar se funciona
docker run --rm telemetria-backend:test node --version

# Ver tamanho da imagem
docker images telemetria-backend:test
```

### 3. Build e Push para Produção

```bash
# Com versão específica
./scripts/build-backend.sh 1.0.0

# Ou com versão latest (padrão)
./scripts/build-backend.sh

# O script vai:
# ✅ Fazer build otimizado
# ✅ Testar a imagem
# ✅ Fazer push pro DockerHub
# ✅ Taguear como latest
```

**🎯 Tempo estimado:** 5-10 minutos (primeira vez)

### 4. Verificar no DockerHub

Acesse: https://hub.docker.com/r/felipebatista54/telemetria-backend

Verifique se a imagem foi publicada com sucesso.

---

## 🚀 Deploy no Servidor (Ubuntu)

### 1. Preparar Servidor

```bash
# SSH no servidor
ssh usuario@servidor-ip

# Criar diretório do projeto
mkdir -p ~/telemetria-pioneira
cd ~/telemetria-pioneira

# Clonar repositório (ou fazer pull se já existe)
git clone <url-do-repo> .
# ou
git pull origin main
```

### 2. Transferir Arquivos de Configuração

**Do Mac, execute:**

```bash
# Transferir .env.production
scp .env.production usuario@servidor:/home/usuario/telemetria-pioneira/

# Transferir docker-compose.prod.yml
scp docker-compose.prod.yml usuario@servidor:/home/usuario/telemetria-pioneira/

# Transferir scripts
scp -r scripts usuario@servidor:/home/usuario/telemetria-pioneira/
```

### 3. Preparar Scripts no Servidor

```bash
# No servidor
cd ~/telemetria-pioneira

# Dar permissões
chmod +x scripts/*.sh

# Criar diretórios
mkdir -p backups/postgres/prod backups/env
```

### 4. Executar Deploy

```bash
# Executar script de deploy
./scripts/deploy-backend.sh

# OU com versão específica
./scripts/deploy-backend.sh 1.0.0

# O script vai:
# ✅ Fazer pull da imagem
# ✅ Parar containers antigos
# ✅ Subir novos containers
# ✅ Verificar health checks
# ✅ Testar endpoints
```

**🎯 Tempo estimado:** 3-5 minutos

### 5. Verificar Deploy

```bash
# Ver status dos containers
docker-compose -f docker-compose.prod.yml ps

# Todos devem estar "Up" e "healthy":
# - telemetria-postgres
# - telemetria-redis
# - telemetria-backend
# - telemetria-worker-events

# Testar API
curl http://localhost:3007/health

# Deve retornar JSON com status: healthy
```

---

## 💾 Migração de Dados

### Opção 1: Backup e Restore (Recomendado)

#### No Mac (Desenvolvimento)

```bash
# 1. Criar backup do banco de desenvolvimento
./scripts/db-backup.sh dev

# Isso gera: backups/postgres/dev/telemetria_backup_dev_TIMESTAMP.sql.gz
```

#### Transferir para Servidor

```bash
# 2. Transferir backup para o servidor
scp backups/postgres/dev/telemetria_backup_dev_*.sql.gz \
    usuario@servidor:/home/usuario/telemetria-pioneira/backups/postgres/prod/
```

#### No Servidor (Produção)

```bash
# 3. Restaurar backup
./scripts/db-restore.sh prod telemetria_backup_dev_TIMESTAMP.sql.gz

# ATENÇÃO: Digite "CONFIRMAR" quando solicitado
# Isso vai SOBRESCREVER todos os dados!

# 4. Verificar logs após restore
docker logs -f telemetria-backend
```

### Opção 2: Migrations (Se já tem TypeORM configurado)

```bash
# No servidor
docker exec telemetria-backend pnpm migrate

# Ou manualmente
docker exec -it telemetria-backend sh
cd /app
node dist/database/migrate.js
```

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Backend API
docker logs -f telemetria-backend

# Worker Events
docker logs -f telemetria-worker-events

# PostgreSQL
docker logs -f telemetria-postgres

# Redis
docker logs -f telemetria-redis

# Todos juntos
docker-compose -f docker-compose.prod.yml logs -f
```

### Verificar Saúde

```bash
# Health check da API
curl http://localhost:3007/health | jq

# Verificar conexão com DB
docker exec telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db -c "SELECT version();"

# Verificar Redis
docker exec telemetria-redis redis-cli ping
```

### Estatísticas do Banco

```bash
# Tamanho do banco
docker exec telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db -c "SELECT pg_size_pretty(pg_database_size('telemetriaPioneira_db'));"

# Número de tabelas
docker exec telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Últimos eventos
docker exec telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db -c "SELECT COUNT(*), MAX(created_at) FROM telemetry_events;"
```

### Uso de Recursos

```bash
# CPU e Memória de cada container
docker stats telemetria-backend telemetria-worker-events telemetria-postgres telemetria-redis

# Espaço em disco dos volumes
docker system df -v
```

---

## 🔧 Troubleshooting

### Container não inicia

```bash
# Ver logs completos
docker logs telemetria-backend --tail 100

# Verificar se variáveis de ambiente estão corretas
docker exec telemetria-backend env | grep DATABASE

# Reiniciar container
docker restart telemetria-backend
```

### Erro de conexão com o banco

```bash
# Verificar se PostgreSQL está rodando
docker ps | grep telemetria-postgres

# Verificar health do PostgreSQL
docker inspect telemetria-postgres | grep -A 5 Health

# Testar conexão manualmente
docker exec -it telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db
```

### API retorna 502/503

```bash
# Verificar se backend está healthy
docker ps | grep telemetria-backend

# Ver últimos erros nos logs
docker logs telemetria-backend --tail 50 | grep ERROR

# Verificar se porta está sendo usada
netstat -tulpn | grep 3007
```

### Worker não processa eventos

```bash
# Ver logs do worker
docker logs -f telemetria-worker-events

# Verificar se Redis está acessível
docker exec telemetria-backend sh -c "redis-cli -h telemetria-redis ping"

# Reiniciar worker
docker restart telemetria-worker-events
```

### Banco de dados corrompido

```bash
# 1. Parar aplicação
docker-compose -f docker-compose.prod.yml down

# 2. Restaurar último backup
./scripts/db-restore.sh prod

# 3. Subir aplicação
./scripts/deploy-backend.sh
```

### Limpar tudo e recomeçar

```bash
# ⚠️ CUIDADO: Isso apaga TODOS os dados!

# 1. Parar e remover containers
docker-compose -f docker-compose.prod.yml down -v

# 2. Remover volumes (apaga dados!)
docker volume rm telemetria-postgres-data
docker volume rm telemetria-redis-data

# 3. Subir do zero
./scripts/deploy-backend.sh

# 4. Restaurar backup
./scripts/db-restore.sh prod <arquivo_backup>
```

---

## 🛠️ Comandos Úteis

### Gerenciamento de Containers

```bash
# Listar containers do Telemetria
docker ps -a --filter "name=telemetria-"

# Parar todos os containers
docker-compose -f docker-compose.prod.yml stop

# Iniciar todos os containers
docker-compose -f docker-compose.prod.yml start

# Reiniciar um container específico
docker restart telemetria-backend

# Remover containers (mantém volumes)
docker-compose -f docker-compose.prod.yml down

# Remover tudo incluindo volumes
docker-compose -f docker-compose.prod.yml down -v
```

### Gerenciamento de Imagens

```bash
# Listar imagens
docker images | grep telemetria

# Remover imagens antigas
docker image prune -a

# Fazer pull de nova versão
docker pull felipebatista54/telemetria-backend:latest

# Ver histórico de uma imagem
docker history felipebatista54/telemetria-backend:latest
```

### Backups

```bash
# Backup manual
./scripts/db-backup.sh prod

# Listar backups
ls -lh backups/postgres/prod/

# Verificar integridade de um backup
shasum -a 256 -c backups/postgres/prod/telemetria_backup_prod_*.sql.gz.sha256
```

### Acesso Direto aos Containers

```bash
# Shell no backend
docker exec -it telemetria-backend sh

# Shell no PostgreSQL
docker exec -it telemetria-postgres sh

# psql direto
docker exec -it telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db

# Redis CLI
docker exec -it telemetria-redis redis-cli
```

### Limpeza

```bash
# Limpar containers parados
docker container prune

# Limpar imagens não utilizadas
docker image prune -a

# Limpar volumes não utilizados
docker volume prune

# Limpar tudo (CUIDADO!)
docker system prune -a --volumes
```

---

## 🔄 Atualizações

### Atualizar Backend

```bash
# 1. No Mac: Build nova versão
./scripts/build-backend.sh 1.0.1

# 2. No servidor: Deploy nova versão
./scripts/deploy-backend.sh 1.0.1
```

### Rollback para Versão Anterior

```bash
# Deploy versão específica anterior
./scripts/deploy-backend.sh 1.0.0

# Ou restaurar backup do banco se necessário
./scripts/db-restore.sh prod telemetria_backup_prod_TIMESTAMP.sql.gz
```

---

## 📈 Automação (Opcional)

### Backup Automático Diário

```bash
# No servidor, editar crontab
crontab -e

# Adicionar linha (backup às 3h da manhã):
0 3 * * * cd /home/usuario/telemetria-pioneira && ./scripts/db-backup.sh prod >> /var/log/telemetria-backup.log 2>&1
```

### Monitoramento com Healthcheck

```bash
# Criar script de monitoramento
cat > /home/usuario/monitor-telemetria.sh << 'EOF'
#!/bin/bash
HEALTH=$(curl -s http://localhost:3007/health | jq -r '.data.status')
if [ "$HEALTH" != "healthy" ]; then
    echo "$(date): API UNHEALTHY!" | mail -s "Telemetria Alert" admin@vpioneira.com.br
fi
EOF

chmod +x /home/usuario/monitor-telemetria.sh

# Adicionar ao crontab (verificar a cada 5 minutos)
*/5 * * * * /home/usuario/monitor-telemetria.sh
```

---

## 🔐 Segurança

### Checklist de Segurança

- ✅ `.env.production` com permissões 600
- ✅ `.env.production` não está no Git
- ✅ Secrets diferentes de desenvolvimento
- ✅ CORS configurado com domínio específico
- ✅ Swagger desabilitado em produção
- ✅ Rate limiting habilitado
- ✅ Helmet habilitado
- ✅ Logs sem informações sensíveis
- ✅ Backups criptografados/protegidos
- ✅ Acesso SSH com chave, não senha

### Verificar Segurança

```bash
# Verificar permissões do .env
ls -la .env.production
# Deve mostrar: -rw------- (600)

# Verificar se secrets são diferentes de dev
diff .env.production apps/backend/.env
# Deve mostrar muitas diferenças!

# Verificar CORS
curl -H "Origin: https://site-malicioso.com" http://localhost:3007/health -v
# Deve ser bloqueado!
```

---

## 📞 Suporte

### Informações de Contato

- **Desenvolvedor:** Felipe Batista
- **Email:** felipe@vpioneira.com.br
- **Projeto:** Telemetria Pioneira

### Links Úteis

- **DockerHub:** https://hub.docker.com/r/felipebatista54/telemetria-backend
- **Documentação TypeORM:** https://typeorm.io
- **Documentação Fastify:** https://www.fastify.io

---

## 📝 Notas Finais

- ✅ Sempre faça backup antes de atualizações importantes
- ✅ Teste mudanças em desenvolvimento antes de produção
- ✅ Monitore os logs regularmente
- ✅ Mantenha documentação atualizada
- ✅ Comunique mudanças à equipe

**Bom deploy! 🚀**
