# Guia de Deploy - Telemetria Pioneira

Este documento descreve o processo de deploy da aplicação Telemetria Pioneira em um servidor Ubuntu.

## 1. Pré-requisitos

- Acesso SSH ao servidor de produção.
- Docker e Docker Compose instalados no servidor.
- Conta no DockerHub com acesso para publicar as imagens da aplicação.

## 2. Visão Geral do Processo

O processo de deploy é dividido em duas etapas principais:

1.  **Build e Push das Imagens Docker:** As imagens do backend e do frontend são buildadas e publicadas no DockerHub.
2.  **Deploy no Servidor:** As novas imagens são baixadas no servidor de produção e os containers são atualizados.

## 3. Build e Push das Imagens Docker

Os scripts `build-backend.sh` e `build-frontend.sh` são responsáveis por buildar e publicar as imagens no DockerHub.

### 3.1 Backend

Para buildar e publicar a imagem do backend, execute o seguinte comando no seu ambiente de desenvolvimento:

```bash
./scripts/build-backend.sh <VERSAO>
```

Substitua `<VERSAO>` pela versão da imagem que você deseja publicar (ex: `1.0.0`).

### 3.2 Frontend

Para buildar e publicar a imagem do frontend, execute o seguinte comando:

```bash
./scripts/build-frontend.sh <VERSAO>
```

## 4. Deploy no Servidor

O deploy no servidor é feito utilizando o Docker Compose. O arquivo `docker-compose.prod.yml` define os serviços da aplicação para o ambiente de produção.

### 4.1 Conectando ao Servidor

Conecte-se ao servidor de produção via SSH:

```bash
ssh usuario@<IP_DO_SERVIDOR>
```

### 4.2 Atualizando a Aplicação

Navegue até o diretório da aplicação e execute os seguintes comandos para baixar as novas imagens e atualizar os containers:

```bash
cd /caminho/para/telemetria-pioneira

docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 5. Rollback

Em caso de problemas com a nova versão, é possível fazer o rollback para a versão anterior da aplicação. Para isso, basta utilizar a tag da imagem anterior no arquivo `docker-compose.prod.yml` e executar o deploy novamente.
