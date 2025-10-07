# 🚀 GUIA COMPLETO DE DEPLOY NO SERVIDOR UBUNTU

**Sistema:** Telemetria Pioneira  
**Backend:** felipebatista54/telemetria-backend:1.0.0  
**Frontend:** felipebatista54/telemetria-frontend:1.0.0

---

## 📋 PARTE 1: PREPARAÇÃO NO MAC (ANTES DE IR PRO SERVIDOR)

### 1.1 Verificar se tudo foi feito

```bash
# No Mac, na raiz do projeto
cd ~/coding/telemetria-pioneira

# Verificar arquivos necessários
ls -la .env.production
ls -la apps/frontend/.env.production
ls -la docker-compose.prod.yml
ls -la scripts/*.sh

# Se algum não existir, você esqueceu algo!
```

### 1.2 Criar backup do banco de desenvolvimento

```bash
# Criar backup do banco local
./scripts/db-backup.sh dev

# Verificar backup criado
ls -lh backups/postgres/dev/

# Anotar o nome do arquivo mais recente:
# Exemplo: telemetria_backup_dev_20250107_153045.sql.gz
```

---

## 📋 PARTE 2: CONECTAR NO SERVIDOR

### 2.1 SSH no servidor

```bash
# Substituir por seus dados reais
ssh usuario@IP_DO_SERVIDOR

# Exemplo:
# ssh root@191.234.567.890
# ou
# ssh ubuntu@telemetria.vpioneira.com.br
```

### 2.2 Criar estrutura de diretórios

```bash
# No servidor
mkdir -p ~/telemetria-pioneira
cd ~/telemetria-pioneira
```

---

## 📋 PARTE 3: TRANSFERIR ARQUIVOS DO MAC PARA O SERVIDOR

### 3.1 Abrir NOVO terminal no Mac (manter SSH aberto)

```bash
# No Mac, em novo terminal
cd ~/coding/telemetria-pioneira

# Transferir arquivos essenciais (AJUSTE O CAMINHO DO SERVIDOR)
# Substitua 'usuario@IP_DO_SERVIDOR' pelos dados reais

# 1. Docker Compose
scp docker-compose.prod.yml usuario@IP_DO_SERVIDOR:~/telemetria-pioneira/

# 2. Variáveis de ambiente do backend
scp .env.production usuario@IP_DO_SERVIDOR:~/telemetria-pioneira/

# 3. Variáveis de ambiente do frontend
scp apps/frontend/.env.production usuario@IP_DO_SERVIDOR:~/telemetria-pioneira/apps/frontend/.env.production

# 4. Scripts
scp -r scripts usuario@IP_DO_SERVIDOR:~/telemetria-pioneira/

# 5. Backup do banco
scp backups/postgres/dev/telemetria_backup_dev_*.sql.gz usuario@IP_DO_SERVIDOR:~/telemetria-pioneira/backups/postgres/prod/

# Exemplo real:
# scp docker-compose.prod.yml root@191.234.567.890:~/telemetria-pioneira/
```

---

## 📋 PARTE 4: CONFIGURAR SERVIDOR (NO SSH)

### 4.1 Voltar pro terminal SSH do servidor

```bash
# Verificar se arquivos chegaram
cd ~/telemetria-pioneira
ls -la

# Deve ver:
# - docker-compose.prod.yml
# - .env.production
# - scripts/
# - backups/
```

### 4.2 Criar estrutura de diretórios

```bash
# Criar diretórios necessários
mkdir -p backups/postgres/prod
mkdir -p backups/env
mkdir -p apps/frontend

# Dar permissões aos scripts
chmod +x scripts/*.sh

# Verificar
ls -la scripts/
```

### 4.3 Verificar .env.production

```bash
# Ver se variáveis estão corretas
cat .env.production | grep DATABASE_HOST
# Deve mostrar: DATABASE_HOST=telemetria-postgres

cat .env.production | grep REDIS_HOST
# Deve mostrar: REDIS_HOST=telemetria-redis

cat .env.production | grep CORS_ORIGIN
# Deve mostrar: CORS_ORIGIN=https://telemetria.vpioneira.com.br

# Se algo estiver errado, edite:
nano .env.production
```

### 4.4 Verificar .env.production do frontend

```bash
# Ver arquivo do frontend
cat apps/frontend/.env.production | grep NEXT_PUBLIC_API_URL
# Deve mostrar: NEXT_PUBLIC_API_URL=https://telemetriaapi.vpioneira.com.br/api

# Se errado, edite:
nano apps/frontend/.env.production
```

---

## 📋 PARTE 5: DEPLOY DOS CONTAINERS

### 5.1 Fazer pull das imagens

```bash
# Pull do backend
docker pull felipebatista54/telemetria-backend:1.0.0

# Pull do frontend
docker pull felipebatista54/telemetria-frontend:1.0.0

# Verificar imagens
docker images | grep telemetria
```

### 5.2 Subir os containers

```bash
# Subir TUDO (PostgreSQL, Redis, Backend, Frontend, Worker)
docker-compose -f docker-compose.prod.yml up -d

# Acompanhar logs iniciais
docker-compose -f docker-compose.prod.yml logs -f
```

### 5.3 Aguardar containers iniciarem (2-3 minutos)

```bash
# Pressione Ctrl+C para parar de ver logs

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Todos devem estar "Up" e "healthy"
```

---

## 📋 PARTE 6: RESTAURAR BANCO DE DADOS

### 6.1 Verificar se backup chegou

```bash
ls -lh backups/postgres/prod/

# Anotar nome exato do arquivo
```

### 6.2 Restaurar backup

```bash
# Executar restore (AJUSTE O NOME DO ARQUIVO)
./scripts/db-restore.sh prod telemetria_backup_dev_20250107_153045.sql.gz

# Quando pedir confirmação, digite: CONFIRMAR
```

### 6.3 Aguardar restore concluir

```bash
# Pode levar alguns minutos dependendo do tamanho do banco
# Acompanhe a tela
```

---

## 📋 PARTE 7: VERIFICAR SE TUDO ESTÁ FUNCIONANDO

### 7.1 Verificar health checks

```bash
# Backend API
curl http://localhost:3007/health

# Deve retornar JSON com "status": "healthy"

# Frontend
curl http://localhost:3006/api/health

# Deve retornar JSON com "status": "healthy"
```

### 7.2 Verificar logs

```bash
# Backend
docker logs --tail 50 telemetria-backend

# Frontend
docker logs --tail 50 telemetria-frontend

# Worker
docker logs --tail 50 telemetria-worker-events

# PostgreSQL
docker logs --tail 20 telemetria-postgres

# Redis
docker logs --tail 20 telemetria-redis
```

### 7.3 Verificar banco de dados

```bash
# Conectar no PostgreSQL
docker exec -it telemetria-postgres psql -U telemetria_prod -d telemetriaPioneira_db

# Dentro do psql, verificar tabelas
\dt

# Ver quantidade de registros
SELECT COUNT(*) FROM telemetry_events;

# Sair
\q
```

---

## 📋 PARTE 8: TESTES FINAIS

### 8.1 Testar API externamente (do seu Mac)

```bash
# No Mac, testar endpoint público
curl https://telemetriaapi.vpioneira.com.br/health

# Deve retornar JSON
```

### 8.2 Testar Frontend no navegador

```
Abrir navegador:
https://telemetria.vpioneira.com.br

Deve carregar a tela de login
```

### 8.3 Testar login

```
1. Acessar https://telemetria.vpioneira.com.br
2. Fazer login com credenciais do admin
3. Verificar se dashboard carrega
4. Verificar se dados aparecem
```

---

## 📋 PARTE 9: COMANDOS ÚTEIS PÓS-DEPLOY

### 9.1 Ver status de tudo

```bash
docker-compose -f docker-compose.prod.yml ps
```

### 9.2 Reiniciar um serviço

```bash
# Reiniciar backend
docker-compose -f docker-compose.prod.yml restart telemetria-backend

# Reiniciar frontend
docker-compose -f docker-compose.prod.yml restart telemetria-frontend

# Reiniciar worker
docker-compose -f docker-compose.prod.yml restart telemetria-worker-events
```

### 9.3 Ver logs em tempo real

```bash
# Todos os logs
docker-compose -f docker-compose.prod.yml logs -f

# Só backend
docker logs -f telemetria-backend

# Só frontend
docker logs -f telemetria-frontend

# Só worker
docker logs -f telemetria-worker-events
```

### 9.4 Parar tudo

```bash
docker-compose -f docker-compose.prod.yml stop
```

### 9.5 Iniciar tudo

```bash
docker-compose -f docker-compose.prod.yml start
```

### 9.6 Remover tudo (CUIDADO!)

```bash
# Remove containers mas MANTÉM volumes (dados do banco)
docker-compose -f docker-compose.prod.yml down

# Remove TUDO incluindo dados (SÓ USE SE TEM BACKUP!)
docker-compose -f docker-compose.prod.yml down -v
```

---

## 📋 PARTE 10: TROUBLESHOOTING

### 10.1 Container não inicia

```bash
# Ver erro detalhado
docker logs telemetria-backend --tail 100

# Verificar variáveis de ambiente
docker exec telemetria-backend env | grep DATABASE
```

### 10.2 Erro de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Verificar health do banco
docker inspect telemetria-postgres | grep -A 5 Health

# Reiniciar banco
docker restart telemetria-postgres
```

### 10.3 Frontend não conecta na API

```bash
# Verificar variável de ambiente
docker exec telemetria-frontend env | grep NEXT_PUBLIC_API_URL

# Deve ser: https://telemetriaapi.vpioneira.com.br/api

# Se errado, edite .env.production do frontend e rebuild
```

### 10.4 Worker não processa eventos

```bash
# Ver logs do worker
docker logs -f telemetria-worker-events

# Verificar se Redis está OK
docker exec telemetria-redis redis-cli ping

# Deve retornar: PONG
```

---

## 📋 PARTE 11: BACKUP AUTOMÁTICO (OPCIONAL)

### 11.1 Configurar backup diário

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup às 3h da manhã):
0 3 * * * cd ~/telemetria-pioneira && ./scripts/db-backup.sh prod >> /var/log/telemetria-backup.log 2>&1

# Salvar e sair
```

---

## 📋 CHECKLIST FINAL

- [ ] Arquivos transferidos do Mac pro servidor
- [ ] Scripts com permissão de execução
- [ ] .env.production configurado corretamente
- [ ] Docker Compose subiu todos os containers
- [ ] Todos os containers estão "healthy"
- [ ] Banco de dados restaurado com sucesso
- [ ] Backend responde: http://localhost:3007/health
- [ ] Frontend responde: http://localhost:3006/api/health
- [ ] API externa acessível: https://telemetriaapi.vpioneira.com.br
- [ ] Frontend externo acessível: https://telemetria.vpioneira.com.br
- [ ] Login funciona no frontend
- [ ] Dashboard carrega dados
- [ ] Worker processa eventos (verificar logs)

---

## 🎉 DEPLOY CONCLUÍDO!

Se todos os itens do checklist estão ✅, seu deploy está completo e funcionando!

**Portas no servidor:**

- Backend API: 3007 → https://telemetriaapi.vpioneira.com.br
- Frontend: 3006 → https://telemetria.vpioneira.com.br
- PostgreSQL: 5437 (apenas local)
- Redis: 6381 (apenas local)

**Monitoramento:**

```bash
# Ver tudo de uma vez
watch -n 5 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

---

## 📞 SUPORTE

Se algo der errado:

1. Verifique logs: `docker logs -f telemetria-backend`
2. Verifique health: `curl http://localhost:3007/health`
3. Verifique conexões: `docker exec telemetria-backend env`
4. Reinicie container: `docker restart telemetria-backend`

**Bom deploy! 🚀**
