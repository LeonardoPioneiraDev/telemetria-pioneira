# Telemetria Pioneira

## 📖 Sobre o Projeto

O projeto **Telemetria Pioneira** é uma solução completa para coleta, armazenamento e visualização de dados de telemetria de veículos. A aplicação foi desenvolvida para consumir dados da API da MiX Telematics, processá-los e apresentá-los de forma clara e organizada em um frontend moderno.

A arquitetura foi pensada para ser robusta, escalável e resiliente, garantindo a integridade e a disponibilidade dos dados.

---

## ✨ Tecnologias

A aplicação é um monorepo gerenciado com `pnpm` e `turbo`, dividido em duas aplicações principais: `backend` e `frontend`.

### Backend

- **Linguagem:** TypeScript
- **Framework:** Fastify
- **ORM:** TypeORM
- **Banco de Dados:** PostgreSQL
- **Filas e Workers:** BullMQ e Redis
- **Autenticação:** JWT
- **Containerização:** Docker

### Frontend

- **Linguagem:** TypeScript
- **Framework:** Next.js
- **UI:** React
- **Estilização:** Tailwind CSS
- **Containerização:** Docker

---

## 🏗️ Arquitetura

A arquitetura do sistema é baseada em três pilares:

1.  **Workers de Ingestão de Dados (ETL):** Processos em background que consomem a API da MiX Telematics de forma contínua e resiliente.
2.  **Banco de Dados (PostgreSQL):** Fonte única da verdade, armazenando todos os dados de telemetria de forma estruturada.
3.  **API Restful (Backend):** Camada de serviço que expõe os dados para o frontend, garantindo performance e segurança.

![Arquitetura](https://i.imgur.com/9v4Y4Gk.png)

---

## 🚀 Começando

### Pré-requisitos

- Node.js v18+
- pnpm 8.15+
- Docker
- Docker Compose

### 1. Clonando o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd telemetria-pioneira
```

### 2. Variáveis de Ambiente

A aplicação utiliza arquivos `.env` para configuração. Renomeie os arquivos de exemplo e preencha com os valores corretos para o seu ambiente.

**Backend:**

```bash
cp apps/backend/.env.example apps/backend/.env
```

**Frontend:**

> O frontend não necessita de variáveis de ambiente para o ambiente de desenvolvimento.

### 3. Instalando as Dependências

```bash
pnpm install
```

### 4. Executando a Aplicação (Desenvolvimento)

Para subir toda a stack (backend, frontend, banco de dados e redis), utilize o Docker Compose:

```bash
docker-compose up -d
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend:** [http://localhost:3333](http://localhost:3333)

---

## 🚢 Deploy

O deploy da aplicação é feito utilizando Docker. As imagens do backend e do frontend são publicadas no DockerHub e, em seguida, implantadas no servidor de produção.

Para um guia detalhado sobre o processo de deploy, consulte a documentação na pasta `docs/DEPLOY`.

---

## 📚 Documentação

A documentação completa do projeto está localizada na pasta `docs`. Lá você encontrará:

- **`docs/api`:** Documentação detalhada dos endpoints da API.
- **`docs/DEPLOY`:** Guias passo a passo para o deploy da aplicação.
- **`docs/requisitos`:** Detalhes sobre a arquitetura e as regras de negócio.
