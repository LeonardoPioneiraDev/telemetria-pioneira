# Documentação da API - Telemetria Pioneira

Esta é a documentação de todos os endpoints da API do projeto Telemetria Pioneira.

---

## Autenticação

Endpoints relacionados à autenticação, registro e gerenciamento de senhas.

### `POST /api/login`

**Descrição:** Autentica um usuário e retorna um token de acesso.

**Corpo da Requisição:**

```json
{
  "email": "user@example.com",
  "password": "string",
  "rememberMe": "boolean (opcional)"
}
```

### `POST /api/register`

**Descrição:** Registra um novo usuário no sistema.

**Corpo da Requisição:**

```json
{
  "email": "user@example.com",
  "username": "string",
  "fullName": "string",
  "password": "string",
  "acceptTerms": "boolean"
}
```

### `POST /api/refresh`

**Descrição:** Renova um token de acesso expirado utilizando um refresh token.

**Corpo da Requisição:**

```json
{
  "refreshToken": "string"
}
```

### `POST /api/password/reset-request`

**Descrição:** Inicia o fluxo de redefinição de senha para um usuário.

**Corpo da Requisição:**

```json
{
  "email": "user@example.com"
}
```

### `POST /api/password/reset`

**Descrição:** Define uma nova senha para o usuário utilizando o token recebido por e-mail.

**Corpo da Requisição:**

```json
{
  "token": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

### `POST /api/users/{userId}/reset-password-admin`

**Descrição:** (Admin) Força o envio de um e-mail de redefinição de senha para um usuário específico.

**Parâmetros:**

- `userId` (string, UUID): ID do usuário.

---

## Motoristas (Drivers)

Endpoints para consulta de informações sobre os motoristas.

### `GET /api/drivers`

**Descrição:** Busca motoristas por nome.

**Query Params:**

- `search` (string): Termo de busca para o nome do motorista.

### `GET /api/drivers/{driverId}/infractions`

**Descrição:** Retorna a lista de infrações de um motorista específico.

**Parâmetros:**

- `driverId` (number): ID do motorista.

### `GET /api/drivers/{driverId}/performance-report`

**Descrição:** Gera um relatório de performance para um motorista com base em uma data de referência.

**Parâmetros:**

- `driverId` (number): ID do motorista.

**Query Params:**

- `referenceDate` (string, data): Data de referência para o relatório.
- `days` (number): Janela de dias para o relatório.

### `GET /api/drivers/{driverId}/performance-report/range`

**Descrição:** Gera um relatório de performance para um motorista com base em um intervalo de datas.

**Parâmetros:**

- `driverId` (number): ID do motorista.

**Query Params:**

- `startDate` (string, data): Data de início do relatório.
- `endDate` (string, data): Data de fim do relatório.

---

## ETL (Extract, Transform, Load)

Endpoints para monitoramento e controle dos processos de ingestão de dados.

### `GET /api/etl/status`

**Descrição:** Retorna o status geral do ETL de eventos.

### `GET /api/etl/metrics`

**Descrição:** Retorna métricas detalhadas do ETL (eventos por hora, dia, etc.).

### `GET /api/etl/history`

**Descrição:** Retorna o histórico de execuções do ETL.

### `GET /api/etl/health`

**Descrição:** Endpoint de health check para monitoramento externo.

### `POST /api/etl/historical/start`

**Descrição:** Inicia uma carga histórica de eventos de telemetria.

**Corpo da Requisição:**

```json
{
  "startDate": "string (data)",
  "endDate": "string (data)"
}
```

### `GET /api/etl/historical/{jobId}`

**Descrição:** Retorna o status de uma carga histórica específica.

**Parâmetros:**

- `jobId` (string): ID do job da carga histórica.

### `GET /api/etl/historical`

**Descrição:** Lista as cargas históricas recentes.

### `DELETE /api/etl/historical/{jobId}`

**Descrição:** Cancela uma carga histórica em andamento.

**Parâmetros:**

- `jobId` (string): ID do job da carga histórica.

---

## Usuários

Endpoints para gerenciamento de usuários.

### `GET /api/users`

**Descrição:** (Admin) Lista todos os usuários do sistema com filtros e paginação.

**Query Params:**

- `page` (number): Página atual.
- `limit` (number): Itens por página.
- `search` (string): Termo de busca.
- `role` (string): Filtro por perfil de usuário.
- `status` (string): Filtro por status de usuário.
- `sortBy` (string): Campo para ordenação.
- `sortOrder` (string): Ordem da ordenação (`asc` ou `desc`).