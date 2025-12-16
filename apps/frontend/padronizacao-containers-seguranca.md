# Padronizacao de Containers - Seguranca

## Guia de Boas Praticas para Containers Docker Seguros

---

### 1. Introducao

Este documento estabelece padroes de seguranca para a criacao de containers Docker na organizacao. As praticas aqui descritas foram fundamentais para **bloquear tentativas de invasao** durante o incidente CVE-2025-55182, onde atacantes conseguiram explorar vulnerabilidades mas **nao conseguiram executar codigo malicioso** devido as configuracoes de seguranca dos containers.

#### Por que isso importa?

Mesmo quando uma vulnerabilidade e explorada, um container bem configurado pode:
- Impedir download de malware (sem wget/curl)
- Impedir execucao de scripts (sem bash/sh completo)
- Impedir persistencia (sistema de arquivos read-only)
- Impedir escalacao de privilegios (usuario nao-root)
- Limitar o impacto do ataque (isolamento de rede)

---

### 2. Imagem Base Recomendada

#### 2.1 Use Alpine Linux

**SEMPRE** prefira imagens baseadas em Alpine Linux:

```dockerfile
# CORRETO - Imagem minimalista
FROM node:20-alpine

# EVITAR - Imagens completas com ferramentas desnecessarias
FROM node:20
FROM node:20-debian
FROM ubuntu:22.04
```

#### Por que Alpine?

| Caracteristica | Alpine | Debian/Ubuntu |
|----------------|--------|---------------|
| Tamanho | ~5MB | ~100-200MB |
| Ferramentas de ataque | Minimas | Muitas pre-instaladas |
| Shell padrao | ash (limitado) | bash (completo) |
| Superficie de ataque | Pequena | Grande |

#### 2.2 Versoes Especificas

**SEMPRE** use tags especificas, nunca `latest`:

```dockerfile
# CORRETO - Versao especifica
FROM node:20.10.0-alpine3.19

# EVITAR - Tag generica
FROM node:alpine
FROM node:latest
```

---

### 3. Usuario Nao-Root

#### 3.1 Nunca Execute como Root

**OBRIGATORIO**: Criar e usar usuario sem privilegios:

```dockerfile
# Criar grupo e usuario sem privilegios
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Definir proprietario dos arquivos
COPY --chown=appuser:appgroup . /app

# Mudar para usuario sem privilegios ANTES de executar
USER appuser

# Comando de execucao (ja roda como appuser)
CMD ["node", "server.js"]
```

#### 3.2 Verificar Usuario em Runtime

```bash
# Verificar se container roda como non-root
docker exec container_name whoami
# Deve retornar: appuser (NAO root)

docker exec container_name id
# Deve retornar: uid=1001(appuser) gid=1001(appgroup)
```

---

### 4. Remover Ferramentas Perigosas

#### 4.1 Nao Instalar Ferramentas de Rede

**NUNCA** instale estas ferramentas em producao:

```dockerfile
# PROIBIDO em producao
RUN apk add --no-cache wget curl bash netcat nmap telnet ssh
```

#### 4.2 Remover Ferramentas Apos Build

Se precisar de ferramentas durante o build, remova depois:

```dockerfile
# Instalar apenas para build, remover depois
RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ && \
    npm ci --only=production && \
    apk del .build-deps
```

#### 4.3 Lista de Ferramentas a Evitar

| Ferramenta | Risco | Alternativa |
|------------|-------|-------------|
| `wget` | Download de malware | Nao instalar |
| `curl` | Download de malware | Nao instalar |
| `bash` | Execucao de scripts | Usar `sh` limitado |
| `netcat/nc` | Reverse shell | Nao instalar |
| `ssh` | Acesso remoto | Nao instalar |
| `telnet` | Acesso remoto | Nao instalar |
| `nmap` | Scanning de rede | Nao instalar |
| `python` | Execucao de scripts | Remover apos build |

---

### 5. Multi-Stage Builds

#### 5.1 Separar Build de Producao

**OBRIGATORIO**: Usar multi-stage builds para reduzir superficie de ataque:

```dockerfile
# ==========================================
# STAGE 1: BUILD
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias de build
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# STAGE 2: PRODUCAO (imagem limpa)
# ==========================================
FROM node:20-alpine AS runner

# Criar usuario nao-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Copiar APENAS arquivos necessarios
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Remover ferramentas desnecessarias
RUN apk del apk-tools

USER nextjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### 5.2 Beneficios do Multi-Stage

| Aspecto | Sem Multi-Stage | Com Multi-Stage |
|---------|-----------------|-----------------|
| Tamanho da imagem | ~1GB | ~150MB |
| Ferramentas de build | Presentes | Removidas |
| Codigo fonte | Exposto | Apenas compilado |
| Dependencias dev | Incluidas | Excluidas |

---

### 6. Sistema de Arquivos

#### 6.1 Read-Only Root Filesystem

Quando possivel, execute com filesystem read-only:

```yaml
# docker-compose.yml
services:
  app:
    image: minha-app:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

#### 6.2 Volumes Minimos

**NAO** monte volumes desnecessarios:

```yaml
# CORRETO - Apenas logs
volumes:
  - app-logs:/app/logs

# EVITAR - Montar muito
volumes:
  - ./:/app
  - /var/run/docker.sock:/var/run/docker.sock  # NUNCA!
```

#### 6.3 Permissoes de Arquivos

```dockerfile
# Arquivos com permissoes restritas
COPY --chown=appuser:appgroup --chmod=444 config.json /app/
COPY --chown=appuser:appgroup --chmod=555 entrypoint.sh /app/
```

---

### 7. Configuracoes de Rede

#### 7.1 Redes Isoladas

Cada aplicacao deve ter sua propria rede:

```yaml
# docker-compose.yml
networks:
  app-internal:
    driver: bridge
    internal: true  # Sem acesso a internet

  app-external:
    driver: bridge
```

#### 7.2 Expor Apenas Portas Necessarias

```yaml
services:
  app:
    ports:
      - "3000:3000"  # Apenas a porta da aplicacao
    # NAO exponha portas de debug, admin, etc.
```

---

### 8. Limites de Recursos

#### 8.1 CPU e Memoria

**OBRIGATORIO**: Definir limites para evitar DoS:

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
```

#### 8.2 Limites de Processos

```yaml
services:
  app:
    ulimits:
      nproc: 100
      nofile:
        soft: 1024
        hard: 2048
```

---

### 9. Processo Init (PID 1)

#### 9.1 Usar Tini ou Dumb-Init

**OBRIGATORIO**: Nao executar aplicacao diretamente como PID 1:

```dockerfile
# Instalar tini
RUN apk add --no-cache tini

# Usar tini como entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]
```

#### Por que usar Tini?

- Gerencia sinais corretamente (SIGTERM, SIGINT)
- Evita processos zumbis
- Shutdown graceful
- Previne problemas de PID 1

---

### 10. Health Checks

#### 10.1 Definir Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js || exit 1
```

Ou no docker-compose:

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 10.2 Script de Health Check Simples

```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.on('timeout', () => process.exit(1));
req.end();
```

---

### 11. Secrets e Variaveis de Ambiente

#### 11.1 Nunca Hardcode Secrets

```dockerfile
# PROIBIDO
ENV DATABASE_PASSWORD=minhasenha123

# CORRETO - Passar em runtime
# docker run -e DATABASE_PASSWORD=$DB_PASS app
```

#### 11.2 Usar Docker Secrets

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

---

### 12. Dockerfile Modelo Completo

```dockerfile
# ==========================================
# DOCKERFILE SEGURO - MODELO PADRAO
# ==========================================

# STAGE 1: Dependencias
FROM node:20.10.0-alpine3.19 AS deps

WORKDIR /app

# Instalar dependencias de build temporarias
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Remover dependencias de build
RUN apk del .build-deps

# STAGE 2: Build
FROM node:20.10.0-alpine3.19 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

RUN npm run build

# STAGE 3: Producao
FROM node:20.10.0-alpine3.19 AS runner

LABEL maintainer="Equipe de Tecnologia"
LABEL description="Container de producao seguro"

# Instalar apenas tini e certificados
RUN apk add --no-cache tini ca-certificates tzdata && \
    rm -rf /var/cache/apk/*

# Criar usuario nao-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Configurar timezone
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime

WORKDIR /app

# Copiar apenas arquivos necessarios
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./

# Variaveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Mudar para usuario nao-root
USER appuser

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Usar tini como init
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de execucao
CMD ["node", "dist/main.js"]
```

---

### 13. Docker-Compose Modelo Completo

```yaml
version: '3.8'

services:
  app:
    image: minha-app:1.0.0
    container_name: minha-app
    restart: unless-stopped

    # Usuario nao-root
    user: "1001:1001"

    # Filesystem read-only
    read_only: true
    tmpfs:
      - /tmp:size=100M

    # Limites de recursos
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

    # Limites de processos
    ulimits:
      nproc: 100
      nofile:
        soft: 1024
        hard: 2048

    # Seguranca
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    # Rede isolada
    networks:
      - app-network

    # Portas
    ports:
      - "3000:3000"

    # Variaveis de ambiente
    environment:
      NODE_ENV: production
      PORT: 3000

    # Secrets
    secrets:
      - jwt_secret
      - db_password

    # Health check
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  app-network:
    driver: bridge

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
```

---

### 14. Checklist de Seguranca

Antes de fazer deploy de qualquer container, verifique:

#### Dockerfile
- [ ] Imagem base Alpine com versao especifica
- [ ] Multi-stage build implementado
- [ ] Usuario nao-root criado e utilizado
- [ ] Sem wget, curl, bash instalados
- [ ] Tini como entrypoint
- [ ] Health check configurado
- [ ] Apenas arquivos necessarios copiados

#### Docker-Compose
- [ ] Limites de CPU e memoria definidos
- [ ] Rede isolada configurada
- [ ] Secrets para credenciais sensiveis
- [ ] read_only habilitado (se possivel)
- [ ] no-new-privileges habilitado
- [ ] Capabilities dropadas
- [ ] Logs com rotacao configurada

#### Runtime
- [ ] Container nao roda como root
- [ ] Portas minimas expostas
- [ ] Volumes minimos montados
- [ ] Nenhum socket Docker montado

---

### 15. Comandos de Verificacao

```bash
# Verificar usuario do container
docker exec container_name whoami

# Verificar capabilities
docker exec container_name cat /proc/1/status | grep Cap

# Verificar se tem ferramentas perigosas
docker exec container_name which wget curl bash nc

# Verificar processos
docker exec container_name ps aux

# Scan de vulnerabilidades da imagem
docker scout cves minha-imagem:tag
# ou
trivy image minha-imagem:tag
```

---

### 16. Conclusao

Containers seguros sao a **ultima linha de defesa**. Mesmo quando vulnerabilidades sao exploradas, um container bem configurado pode:

1. **Impedir download de payloads** - Sem wget/curl
2. **Impedir execucao de scripts** - Sem bash
3. **Impedir persistencia** - Filesystem read-only
4. **Impedir escalacao** - Usuario nao-root
5. **Limitar danos** - Recursos limitados

Estas praticas foram comprovadas durante o incidente CVE-2025-55182, onde **todas as tentativas de execucao de codigo malicioso falharam** devido as configuracoes de seguranca dos containers.

---

**Documento criado por:** Equipe de Tecnologia
**Data:** 07 de dezembro de 2025
**Versao:** 1.0
