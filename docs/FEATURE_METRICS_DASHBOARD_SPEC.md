# Feature Specification: System Metrics Dashboard

> Documentacao tecnica agnóstica de framework para implementacao de um Dashboard de Metricas de Sistema.
> Este documento serve como especificacao para que IAs ou desenvolvedores implementem essa feature em qualquer sistema backend (Fastify, NestJS, Express, etc.) e frontend (React, Vue, Angular, etc.).

---

## 1. Visao Geral

### 1.1 Objetivo
Implementar um dashboard administrativo que monitora metricas de uso e performance do sistema, incluindo:
- **Requisicoes HTTP**: Volume, latencia, distribuicao de status codes
- **Usuarios**: Atividade, logins, ranking de uso
- **Performance**: Endpoints mais lentos, picos de uso, percentis de latencia

### 1.2 Escopo Funcional
| Funcionalidade | Descricao |
|----------------|-----------|
| Captura de Metricas | Interceptar TODAS as requisicoes HTTP e registrar dados de performance |
| Registro de Atividade | Logar eventos de autenticacao (login, logout, troca de senha) |
| Dashboard Consolidado | Exibir metricas agregadas com filtros de periodo |
| Permissionamento | Restrito a usuarios com permissao administrativa |

### 1.3 Fluxo de Dados

```
[Cliente HTTP]
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                    MIDDLEWARE                        │
│  - Captura timestamp inicial                        │
│  - Gera request_id (UUID)                           │
│  - Aguarda resposta                                 │
│  - Calcula latencia                                 │
│  - Salva log ASSINCRONAMENTE                        │
└─────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│              REQUEST_LOGS (Database)                │
└─────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│              METRICS SERVICE                         │
│  - Queries agregadas por periodo                    │
│  - Calculos de percentis (P95, P99)                 │
│  - Rankings e distribuicoes                         │
└─────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│              DASHBOARD (Frontend)                    │
│  - Cards de resumo                                  │
│  - Graficos de linha/barras/pizza                   │
│  - Tabelas de rankings                              │
└─────────────────────────────────────────────────────┘
```

---

## 2. Schema do Banco de Dados

### 2.1 Tabela: `request_logs`

Armazena logs brutos de TODAS as requisicoes HTTP do sistema.

```sql
CREATE TABLE IF NOT EXISTS request_logs (
    id BIGSERIAL PRIMARY KEY,

    -- Identificacao unica da requisicao
    request_id UUID NOT NULL,

    -- Timestamp da requisicao (com timezone)
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Detalhes da requisicao
    method VARCHAR(10) NOT NULL,           -- GET, POST, PUT, DELETE, PATCH
    endpoint VARCHAR(500) NOT NULL,        -- URL completa sem query string
    route_pattern VARCHAR(500),            -- Pattern da rota (ex: /users/:id)

    -- Contexto do usuario (nullable para requisicoes nao autenticadas)
    user_id UUID,
    user_role VARCHAR(50),

    -- Metricas de resposta
    status_code SMALLINT NOT NULL,         -- 200, 404, 500, etc
    latency_ms INTEGER NOT NULL,           -- Tempo de resposta em milissegundos
    response_size_bytes INTEGER,           -- Tamanho da resposta (opcional)

    -- Informacoes do cliente
    ip_address INET,                       -- IP do cliente
    user_agent TEXT,                       -- User-Agent header

    -- Rastreamento de erros
    error_message TEXT,                    -- Mensagem de erro (se houver)
    error_code VARCHAR(100),               -- Codigo do erro (ex: ValidationError)

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES OBRIGATORIOS (criticos para performance das queries)
CREATE INDEX idx_request_logs_timestamp ON request_logs (timestamp DESC);
CREATE INDEX idx_request_logs_user_id ON request_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_request_logs_status_code ON request_logs (status_code);
CREATE INDEX idx_request_logs_endpoint ON request_logs (endpoint);
CREATE INDEX idx_request_logs_latency ON request_logs (latency_ms DESC);

-- Index composto para queries do dashboard
CREATE INDEX idx_request_logs_dashboard ON request_logs (timestamp DESC, status_code, user_id);
```

### 2.2 Tabela: `user_activity_logs`

Registra eventos de autenticacao e atividades importantes dos usuarios.

```sql
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGSERIAL PRIMARY KEY,

    -- Usuario que realizou a acao
    user_id UUID NOT NULL,

    -- Tipo de atividade (enum string)
    -- Valores: 'login', 'logout', 'password_reset', 'password_change'
    activity_type VARCHAR(50) NOT NULL,

    -- Timestamp da atividade
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Informacoes do cliente
    ip_address INET,
    user_agent TEXT,

    -- Metadados adicionais em JSON (extensivel)
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_user_activity_timestamp ON user_activity_logs (timestamp DESC);
CREATE INDEX idx_user_activity_user_id ON user_activity_logs (user_id);
CREATE INDEX idx_user_activity_type ON user_activity_logs (activity_type);

-- Index parcial para queries de logins
CREATE INDEX idx_user_activity_login_stats
    ON user_activity_logs (timestamp DESC, activity_type, user_id)
    WHERE activity_type = 'login';
```

### 2.3 Funcoes de Cleanup (Retencao de Dados)

```sql
-- Limpa logs de requisicoes mais antigos que N dias (padrao: 30)
CREATE OR REPLACE FUNCTION cleanup_old_request_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM request_logs
    WHERE timestamp < (NOW() AT TIME ZONE 'America/Sao_Paulo') - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Limpa logs de atividade mais antigos que N dias (padrao: 90)
CREATE OR REPLACE FUNCTION cleanup_old_user_activity_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_activity_logs
    WHERE timestamp < (NOW() AT TIME ZONE 'America/Sao_Paulo') - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

**IMPORTANTE**: Configurar um CRON job ou scheduler para executar essas funcoes periodicamente:
```sql
-- Exemplo: Executar diariamente
SELECT cleanup_old_request_logs(30);
SELECT cleanup_old_user_activity_logs(90);
```

---

## 3. Regras de Negocio

### 3.1 Timezone
- **OBRIGATORIO**: Todas as operacoes temporais devem usar o timezone `America/Sao_Paulo`
- Datas sao armazenadas como `TIMESTAMPTZ` (com timezone)
- Queries de agrupamento por hora/dia devem converter para o timezone correto

### 3.2 Paths Excluidos da Captura
O middleware NAO deve capturar metricas dos seguintes endpoints para evitar poluicao de dados:
- `/health` - Health checks
- `/api/admin/metrics` - O proprio endpoint de metricas (evitar recursao)
- `/docs` - Documentacao (Swagger, etc.)

```typescript
const EXCLUDED_PATHS = ['/health', '/api/admin/metrics', '/docs'];
```

### 3.3 Captura Assincrona (Performance)
- O registro de metricas NUNCA deve bloquear a resposta ao cliente
- Usar mecanismo assincrono (setImmediate, queue, evento)
- Falhas no registro de metricas devem ser logadas mas NAO devem afetar a requisicao

```
Request → Response ao Cliente → (Async) Salva Log no Banco
```

### 3.4 Periodos de Tempo (TimeRange)
O dashboard suporta os seguintes filtros de periodo:

| Valor | Descricao | Granularidade Sugerida |
|-------|-----------|------------------------|
| `last_hour` | Ultima hora | Por minuto ou hora |
| `last_3h` | Ultimas 3 horas | Por hora |
| `last_6h` | Ultimas 6 horas | Por hora |
| `last_24h` | Ultimas 24 horas | Por hora |
| `last_7d` | Ultimos 7 dias | Por dia |
| `last_30d` | Ultimos 30 dias | Por dia |

### 3.5 Calculos de Metricas

#### Taxa de Erro
```
errorRate = (count(status_code >= 400) / total_requests) * 100
```

#### Percentil 95 (P95)
```sql
PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)
```

#### Usuarios Unicos
- `uniqueUsers`: COUNT DISTINCT de user_id na tabela request_logs
- `uniqueLoggedInUsers`: COUNT DISTINCT de user_id na tabela user_activity_logs onde activity_type = 'login'

### 3.6 Rankings

#### Top Users (por atividade)
- Ordenar por quantidade de requisicoes (DESC)
- Incluir: username, nome completo, role, total requisicoes, dias ativos
- Limite padrao: 10 usuarios

#### Endpoints Mais Lentos
- Ordenar por latencia media (DESC)
- Filtrar endpoints com no minimo 5 requisicoes (evitar outliers)
- Incluir: endpoint, metodo HTTP, count, avg latency, P95, max latency
- Limite padrao: 10 endpoints

---

## 4. Componentes Backend

### 4.1 Arquitetura de Camadas

```
┌─────────────────────────────────────────────────────┐
│                    ROUTES/CONTROLLER                │
│  - Define endpoint GET /api/admin/metrics/dashboard │
│  - Aplica middleware de autenticacao               │
│  - Aplica middleware de autorizacao (permissao)    │
│  - Valida query params (timeRange)                 │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   METRICS SERVICE                   │
│  - getDashboardSummary(timeRange)                  │
│  - getRequestsOverTime(timeRange, granularity)     │
│  - getStatusCodeDistribution(timeRange)            │
│  - getStatusCodeDetails(timeRange)                 │
│  - getTopUsersByActivity(timeRange, limit)         │
│  - getEndpointsRankedByLatency(timeRange, limit)   │
│  - getDailyRequestPeaks(timeRange)                 │
│  - getUniqueLoggedInUsers(timeRange)               │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    DATABASE                         │
│  - request_logs                                    │
│  - user_activity_logs                              │
└─────────────────────────────────────────────────────┘
```

### 4.2 Request Logger Service

Responsavel por salvar logs de requisicoes.

**Metodos:**
- `logRequest(data: RequestLogData): Promise<void>` - Salva sincrono
- `logRequestAsync(data: RequestLogData): void` - Salva assincrono (preferido)

**Interface de Dados:**
```typescript
interface RequestLogData {
  requestId: string;        // UUID gerado no inicio da requisicao
  timestamp: Date;          // Momento da requisicao
  method: string;           // GET, POST, etc
  endpoint: string;         // /api/users (sem query string)
  routePattern: string | null; // /api/users/:id (pattern da rota)
  userId: string | null;    // ID do usuario autenticado
  userRole: string | null;  // Role do usuario
  statusCode: number;       // 200, 404, 500, etc
  latencyMs: number;        // Tempo de resposta
  responseSizeBytes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  errorCode: string | null;
}
```

### 4.3 User Activity Service

Responsavel por registrar atividades de usuarios.

**Metodos:**
- `logActivity(data: LogActivityData): Promise<void>` - Generico
- `logLoginActivity(userId, ipAddress, userAgent): Promise<void>`
- `logLogoutActivity(userId): Promise<void>`
- `logPasswordChangeActivity(userId): Promise<void>`
- `logPasswordResetActivity(userId): Promise<void>`

**Interface de Dados:**
```typescript
type ActivityType = 'login' | 'logout' | 'password_reset' | 'password_change';

interface LogActivityData {
  userId: string;
  activityType: ActivityType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

**Integracao com Auth:**
O servico de autenticacao existente deve chamar `logLoginActivity` apos login bem-sucedido:
```typescript
// No AuthService.login()
await userActivityService.logLoginActivity(user.id, request.ip, request.userAgent);
```

### 4.4 Metrics Service

Responsavel pelas queries agregadas para o dashboard.

**Metodos e Queries SQL:**

#### getDashboardSummary(timeRange)
```sql
SELECT
  COUNT(*)::integer as total_requests,
  COALESCE(AVG(latency_ms), 0)::numeric(10,2) as avg_latency,
  COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::integer as p95_latency,
  COUNT(*) FILTER (WHERE status_code >= 400)::integer as error_count,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::integer as unique_users
FROM request_logs
WHERE timestamp >= $1 AND timestamp <= $2
```

#### getRequestsOverTime(timeRange, granularity)
```sql
SELECT
  DATE_TRUNC($granularity, timestamp AT TIME ZONE 'America/Sao_Paulo') as time_bucket,
  COUNT(*)::integer as request_count,
  COALESCE(AVG(latency_ms), 0)::numeric(10,2) as avg_latency,
  COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::integer as p95_latency
FROM request_logs
WHERE timestamp >= $1 AND timestamp <= $2
GROUP BY time_bucket
ORDER BY time_bucket ASC
```

#### getStatusCodeDistribution(timeRange)
```sql
SELECT
  CASE
    WHEN status_code >= 200 AND status_code < 300 THEN '2xx Success'
    WHEN status_code >= 300 AND status_code < 400 THEN '3xx Redirect'
    WHEN status_code >= 400 AND status_code < 500 THEN '4xx Client Error'
    WHEN status_code >= 500 THEN '5xx Server Error'
    ELSE 'Other'
  END as status_group,
  COUNT(*)::integer as count
FROM request_logs
WHERE timestamp >= $1 AND timestamp <= $2
GROUP BY status_group
ORDER BY count DESC
```

#### getStatusCodeDetails(timeRange)
```sql
SELECT
  status_code,
  CASE
    WHEN status_code >= 200 AND status_code < 300 THEN '2xx Success'
    WHEN status_code >= 300 AND status_code < 400 THEN '3xx Redirect'
    WHEN status_code >= 400 AND status_code < 500 THEN '4xx Client Error'
    WHEN status_code >= 500 THEN '5xx Server Error'
    ELSE 'Other'
  END as status_group,
  COUNT(*)::integer as count
FROM request_logs
WHERE timestamp >= $1 AND timestamp <= $2
GROUP BY status_code
ORDER BY count DESC
LIMIT 20
```

#### getTopUsersByActivity(timeRange, limit)
```sql
SELECT
  rl.user_id,
  COALESCE(u.username, 'unknown') as username,
  COALESCE(u.full_name, 'Unknown User') as full_name,
  COALESCE(u.role::text, 'unknown') as role,
  COUNT(*)::integer as request_count,
  COUNT(DISTINCT DATE_TRUNC('day', rl.timestamp))::integer as active_days
FROM request_logs rl
LEFT JOIN users u ON rl.user_id = u.id
WHERE rl.timestamp >= $1
  AND rl.timestamp <= $2
  AND rl.user_id IS NOT NULL
GROUP BY rl.user_id, u.username, u.full_name, u.role
ORDER BY request_count DESC
LIMIT $3
```

#### getEndpointsRankedByLatency(timeRange, limit)
```sql
SELECT
  COALESCE(route_pattern, endpoint) as endpoint,
  method,
  COUNT(*)::integer as request_count,
  COALESCE(AVG(latency_ms), 0)::numeric(10,2) as avg_latency,
  COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::integer as p95_latency,
  COALESCE(MAX(latency_ms), 0)::integer as max_latency
FROM request_logs
WHERE timestamp >= $1 AND timestamp <= $2
GROUP BY COALESCE(route_pattern, endpoint), method
HAVING COUNT(*) >= 5  -- Filtro para evitar outliers
ORDER BY avg_latency DESC
LIMIT $3
```

#### getDailyRequestPeaks(timeRange)
```sql
WITH daily_hourly AS (
  SELECT
    DATE_TRUNC('day', timestamp AT TIME ZONE 'America/Sao_Paulo')::date as day,
    EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Sao_Paulo')::integer as hour,
    COUNT(*)::integer as requests
  FROM request_logs
  WHERE timestamp >= $1 AND timestamp <= $2
  GROUP BY day, hour
),
daily_peaks AS (
  SELECT
    day,
    hour as peak_hour,
    requests as peak_requests,
    ROW_NUMBER() OVER (PARTITION BY day ORDER BY requests DESC) as rn
  FROM daily_hourly
)
SELECT
  dh.day::text as date,
  SUM(dh.requests)::integer as total_requests,
  dp.peak_hour::integer,
  dp.peak_requests::integer
FROM daily_hourly dh
JOIN daily_peaks dp ON dh.day = dp.day AND dp.rn = 1
GROUP BY dh.day, dp.peak_hour, dp.peak_requests
ORDER BY dh.day ASC
```

#### getUniqueLoggedInUsers(timeRange)
```sql
SELECT COUNT(DISTINCT user_id)::integer as unique_users
FROM user_activity_logs
WHERE activity_type = 'login'
  AND timestamp >= $1
  AND timestamp <= $2
```

### 4.5 Request Metrics Middleware

Intercepta requisicoes para capturar metricas.

**Comportamento:**
1. **OnRequest/Before**: Armazena timestamp inicial e gera UUID
2. **OnResponse/After**: Calcula latencia e envia dados para o logger (async)
3. **OnError**: Captura informacoes de erro e envia para o logger

**Dados capturados:**
- `metricsStartTime`: Timestamp em ms (Date.now())
- `metricsRequestId`: UUID v4

**Pseudocodigo:**
```typescript
// Hook de inicio da requisicao
onRequest(request) {
  request.metricsStartTime = Date.now();
  request.metricsRequestId = generateUUID();
}

// Hook de resposta
onResponse(request, response) {
  if (shouldExcludePath(request.url)) return;

  const latencyMs = Date.now() - request.metricsStartTime;

  requestLoggerService.logRequestAsync({
    requestId: request.metricsRequestId,
    timestamp: new Date(),
    method: request.method,
    endpoint: request.url.split('?')[0],
    routePattern: request.routePattern || null,
    userId: request.user?.id || null,
    userRole: request.user?.role || null,
    statusCode: response.statusCode,
    latencyMs,
    responseSizeBytes: null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    errorMessage: null,
    errorCode: null,
  });
}

// Hook de erro
onError(request, response, error) {
  if (shouldExcludePath(request.url)) return;

  const latencyMs = Date.now() - request.metricsStartTime;

  requestLoggerService.logRequestAsync({
    ...sameFieldsAsAbove,
    statusCode: 500,
    errorMessage: error.message,
    errorCode: error.name,
  });
}
```

---

## 5. API Contract

### 5.1 Endpoint Principal

```
GET /api/admin/metrics/dashboard
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Param | Tipo | Obrigatorio | Default | Valores |
|-------|------|-------------|---------|---------|
| timeRange | string | Nao | `last_24h` | `last_hour`, `last_3h`, `last_6h`, `last_24h`, `last_7d`, `last_30d` |

**Permissao Requerida:**
```
system:metrics
```
Ou role `admin`

### 5.2 Response Schema

```typescript
interface APIResponse {
  success: boolean;
  message: string;
  data: DashboardResponse;
}

interface DashboardResponse {
  summary: {
    totalRequests: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;        // Percentual (0-100)
    uniqueUsers: number;
    uniqueLoggedInUsers: number;
    timeRange: TimeRange;
  };
  charts: {
    requestsOverTime: Array<{
      timestamp: string;      // ISO 8601
      requestCount: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
    }>;
    statusDistribution: Array<{
      statusGroup: string;    // "2xx Success", "4xx Client Error", etc
      count: number;
    }>;
    statusCodeDetails: Array<{
      statusCode: number;
      statusGroup: string;
      description: string;    // "OK", "Not Found", etc
      count: number;
      percentage: number;
    }>;
    dailyPeaks: Array<{
      date: string;           // YYYY-MM-DD
      totalRequests: number;
      peakHour: number;       // 0-23
      peakHourRequests: number;
    }>;
  };
  rankings: {
    topUsers: Array<{
      userId: string;
      username: string;
      fullName: string;
      role: string;
      requestCount: number;
      activeDays: number;
    }>;
    slowestEndpoints: Array<{
      endpoint: string;
      method: string;
      requestCount: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      maxLatencyMs: number;
    }>;
  };
}
```

### 5.3 Exemplo de Response

```json
{
  "success": true,
  "message": "Dashboard metrics retrieved successfully",
  "data": {
    "summary": {
      "totalRequests": 15234,
      "avgLatencyMs": 45.67,
      "p95LatencyMs": 234,
      "errorRate": 2.34,
      "uniqueUsers": 89,
      "uniqueLoggedInUsers": 45,
      "timeRange": "last_24h"
    },
    "charts": {
      "requestsOverTime": [
        {
          "timestamp": "2025-12-16T10:00:00.000Z",
          "requestCount": 523,
          "avgLatencyMs": 42.5,
          "p95LatencyMs": 198
        }
      ],
      "statusDistribution": [
        { "statusGroup": "2xx Success", "count": 14500 },
        { "statusGroup": "4xx Client Error", "count": 650 },
        { "statusGroup": "5xx Server Error", "count": 84 }
      ],
      "statusCodeDetails": [
        { "statusCode": 200, "statusGroup": "2xx Success", "description": "OK", "count": 12000, "percentage": 78.8 },
        { "statusCode": 201, "statusGroup": "2xx Success", "description": "Created", "count": 2500, "percentage": 16.4 }
      ],
      "dailyPeaks": [
        {
          "date": "2025-12-16",
          "totalRequests": 15234,
          "peakHour": 14,
          "peakHourRequests": 1523
        }
      ]
    },
    "rankings": {
      "topUsers": [
        {
          "userId": "uuid-123",
          "username": "joao.silva",
          "fullName": "Joao Silva",
          "role": "admin",
          "requestCount": 2345,
          "activeDays": 7
        }
      ],
      "slowestEndpoints": [
        {
          "endpoint": "/api/reports/generate",
          "method": "POST",
          "requestCount": 45,
          "avgLatencyMs": 2345.67,
          "p95LatencyMs": 4500,
          "maxLatencyMs": 8923
        }
      ]
    }
  }
}
```

---

## 6. Componentes Frontend

### 6.1 Arquitetura de Componentes

```
MetricsDashboardPage
├── TimeRangeSelector         (Filtro de periodo)
├── MetricsSummaryCards       (Cards de resumo)
├── RequestsOverTimeChart     (Grafico de linha - requisicoes)
├── LatencyComparisonChart    (Grafico de linha - latencia avg vs P95)
├── StatusCodePieChart        (Grafico de pizza - distribuicao)
├── StatusCodeDetailsTable    (Tabela - detalhes por status code)
├── DailyPeaksChart           (Grafico de barras - picos diarios)
├── TopUsersTable             (Tabela - top usuarios)
└── SlowestEndpointsTable     (Tabela - endpoints lentos)
```

### 6.2 Hook de Dados

```typescript
function useMetrics(timeRange: TimeRange) {
  return useQuery({
    queryKey: ['metrics', 'dashboard', timeRange],
    queryFn: () => metricsService.getDashboardMetrics(timeRange),
    staleTime: 30 * 1000,        // Dados "frescos" por 30s
    refetchInterval: 60 * 1000,  // Auto-refresh a cada 1 min
  });
}
```

### 6.3 Service Layer

```typescript
const metricsService = {
  async getDashboardMetrics(timeRange: TimeRange): Promise<DashboardMetricsResponse> {
    const response = await api.get('/admin/metrics/dashboard', {
      params: { timeRange }
    });
    return response.data.data;
  },
};
```

### 6.4 Componentes Detalhados

#### TimeRangeSelector
- Dropdown/Select com opcoes de periodo
- Labels em portugues (ou idioma do sistema)
- Dispara onChange para atualizar query

#### MetricsSummaryCards (5 cards)
| Card | Dado | Icone Sugerido |
|------|------|----------------|
| Total de Requisicoes | `summary.totalRequests` | Activity |
| Latencia Media | `summary.avgLatencyMs` ms | Clock |
| Latencia P95 | `summary.p95LatencyMs` ms | Clock |
| Taxa de Erro | `summary.errorRate`% | AlertTriangle |
| Logins Unicos | `summary.uniqueLoggedInUsers` | LogIn |

#### RequestsOverTimeChart
- Tipo: Line Chart
- Eixo X: timestamp (formatado por hora ou dia)
- Eixo Y: requestCount
- Cor sugerida: Azul

#### LatencyComparisonChart
- Tipo: Line Chart com 2 series
- Serie 1: avgLatencyMs (verde)
- Serie 2: p95LatencyMs (laranja)
- Util para identificar outliers

#### StatusCodePieChart
- Tipo: Pie/Donut Chart
- Segmentos: statusDistribution
- Cores sugeridas:
  - 2xx: Verde
  - 3xx: Azul
  - 4xx: Amarelo
  - 5xx: Vermelho

#### StatusCodeDetailsTable
- Colunas: Status Code, Grupo, Descricao, Count, Percentual
- Ordenado por count DESC
- Destaque visual para erros (4xx, 5xx)

#### DailyPeaksChart
- Tipo: Bar Chart
- Eixo X: date
- Eixo Y: totalRequests
- Tooltip: mostra peakHour e peakHourRequests

#### TopUsersTable
- Colunas: Usuario, Role, Requisicoes, Dias Ativos
- Avatar/iniciais do usuario
- Link para perfil (opcional)

#### SlowestEndpointsTable
- Colunas: Endpoint, Metodo, Requisicoes, Avg Latency, P95, Max
- Badge colorido para metodo HTTP
- Highlight para latencias altas (> 1s, > 5s)

### 6.5 Estados da UI

1. **Loading**: Skeletons em todos os componentes
2. **Error**: Card de erro com mensagem e botao "Tentar novamente"
3. **No Permission**: Card informando falta de permissao
4. **Success**: Renderiza todos os componentes com dados
5. **Empty**: Mensagem quando nao ha dados no periodo

### 6.6 UX Guidelines

- **Refresh Manual**: Botao de refresh visivel
- **Auto-refresh**: A cada 60 segundos
- **Loading Indicators**: Usar Skeletons, nunca bloquear a tela inteira
- **Formatacao de Numeros**: Usar separador de milhares (pt-BR: 1.234,56)
- **Formatacao de Datas**: dd/MM/yyyy HH:mm ou relativo ("ha 2 horas")

---

## 7. Seguranca

### 7.1 Autenticacao
- Endpoint requer token JWT valido
- Verificar expiracao do token

### 7.2 Autorizacao
- Verificar permissao `system:metrics` OU role `admin`
- Retornar 403 Forbidden se nao autorizado

### 7.3 Rate Limiting
- Considerar rate limit no endpoint de metricas
- Sugestao: 60 requests/minuto por usuario

### 7.4 Dados Sensiveis
- NAO expor dados sensiveis nos logs (senhas, tokens)
- Considerar anonimizar IPs em ambientes regulados (LGPD)

---

## 8. Performance

### 8.1 Banco de Dados
- Indexes sao CRITICOS para performance
- Particionar tabela `request_logs` por mes se volume for muito alto
- Executar cleanup regularmente para manter tabela em tamanho gerenciavel

### 8.2 Backend
- Captura de metricas SEMPRE assincrona
- Considerar cache de curta duracao (30s) para o endpoint de dashboard
- Executar queries em paralelo (Promise.all) no controller

### 8.3 Frontend
- Usar React Query ou similar para cache client-side
- Lazy load de graficos pesados
- Skeletons durante carregamento

---

## 9. Checklist de Implementacao

### Database
- [ ] Criar tabela `request_logs` com todos os campos
- [ ] Criar tabela `user_activity_logs` com todos os campos
- [ ] Criar todos os indexes listados
- [ ] Criar funcoes de cleanup
- [ ] Configurar job de cleanup automatico

### Backend - Servicos
- [ ] Criar RequestLoggerService com `logRequest` e `logRequestAsync`
- [ ] Criar UserActivityService com metodos de log de atividade
- [ ] Criar MetricsService com todas as queries
- [ ] Integrar UserActivityService no fluxo de login

### Backend - Middleware
- [ ] Criar middleware de captura de metricas
- [ ] Registrar middleware no servidor
- [ ] Configurar lista de paths excluidos
- [ ] Garantir captura assincrona

### Backend - API
- [ ] Criar endpoint GET /api/admin/metrics/dashboard
- [ ] Aplicar middleware de autenticacao
- [ ] Aplicar middleware de autorizacao (permissao)
- [ ] Validar query params com schema (Zod, Joi, class-validator)
- [ ] Executar queries em paralelo
- [ ] Retornar response no formato especificado

### Frontend - Infraestrutura
- [ ] Criar types/interfaces para metricas
- [ ] Criar service para chamada da API
- [ ] Criar hook useMetrics com React Query

### Frontend - Componentes
- [ ] TimeRangeSelector
- [ ] MetricsSummaryCards
- [ ] RequestsOverTimeChart
- [ ] LatencyComparisonChart
- [ ] StatusCodePieChart
- [ ] StatusCodeDetailsTable
- [ ] DailyPeaksChart
- [ ] TopUsersTable
- [ ] SlowestEndpointsTable

### Frontend - Pagina
- [ ] Criar pagina principal do dashboard
- [ ] Implementar verificacao de permissao
- [ ] Implementar estados (loading, error, empty)
- [ ] Adicionar link no menu (admin only)

---

## 10. Extensoes Futuras (Opcional)

Funcionalidades que podem ser adicionadas posteriormente:

1. **Exportar Dados**: CSV/Excel dos dados filtrados
2. **Alertas**: Notificacoes quando taxa de erro ultrapassa threshold
3. **Comparacao de Periodos**: Comparar metricas de 2 periodos
4. **Filtros Adicionais**: Por endpoint, por usuario, por status code
5. **Metricas Real-time**: WebSocket para atualizacao instantanea
6. **Metricas de Banco**: Tempo de queries, conexoes ativas
7. **Metricas de Memoria/CPU**: Integracao com APM

---

## 11. User Activity Dashboard (Modulo de Atividade de Usuarios)

### 11.1 Visao Geral

Modulo dedicado para monitorar e analisar o uso do sistema pelos usuarios, permitindo que a diretoria tenha visibilidade sobre:
- **Engajamento**: Quais usuarios estao realmente usando o sistema
- **Navegacao**: Quais telas/paginas sao mais acessadas
- **Sessoes**: Tempo de uso e frequencia de acesso
- **Historico**: Quando e de onde os usuarios acessam

### 11.2 Fluxo de Dados - Page Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PageTrackingProvider                         │   │
│  │  - Intercepta navegacao entre rotas                      │   │
│  │  - Gera session_id unico por aba do browser              │   │
│  │  - Envia POST /api/metrics/page-view (async)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (API)                                 │
│                                                                  │
│  POST /api/metrics/page-view                                    │
│  - Valida usuario autenticado                                   │
│  - Salva registro ASSINCRONAMENTE                               │
│  - Atualiza last_activity_at do usuario                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER_PAGE_VIEWS (Database)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           USER ACTIVITY METRICS SERVICE                          │
│  - Ranking de usuarios por atividade                            │
│  - Detalhes de uso por usuario                                  │
│  - Paginas mais acessadas                                       │
│  - Historico de logins/sessoes                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           USER ACTIVITY DASHBOARD (Frontend)                     │
│  - Cards de resumo (ativos/inativos)                            │
│  - Tabela de ranking com filtros                                │
│  - Modal de detalhes do usuario                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Schema do Banco - User Activity

### 12.1 Tabela: `user_page_views`

Armazena registros de navegacao dos usuarios pelas paginas do sistema.

```sql
CREATE TABLE IF NOT EXISTS user_page_views (
    id BIGSERIAL PRIMARY KEY,

    -- Usuario que visualizou a pagina
    user_id INTEGER NOT NULL,

    -- Informacoes da pagina
    page_path VARCHAR(500) NOT NULL,       -- /dashboard, /viagens, etc
    page_title VARCHAR(255),               -- Titulo legivel da pagina

    -- Contexto da sessao (agrupa page views da mesma aba do browser)
    session_id VARCHAR(100),

    -- Timing
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_on_page_ms INTEGER,               -- Tempo na pagina (atualizado ao sair)

    -- Informacoes do cliente
    ip_address INET,
    user_agent TEXT,

    -- Referencia (pagina anterior)
    referrer_path VARCHAR(500),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES para performance
CREATE INDEX idx_page_views_user_id ON user_page_views (user_id);
CREATE INDEX idx_page_views_viewed_at ON user_page_views (viewed_at DESC);
CREATE INDEX idx_page_views_page_path ON user_page_views (page_path);
CREATE INDEX idx_page_views_session ON user_page_views (session_id) WHERE session_id IS NOT NULL;

-- Index composto para queries de atividade do usuario
CREATE INDEX idx_page_views_user_activity ON user_page_views (user_id, viewed_at DESC);

-- Index composto para queries de popularidade de paginas
CREATE INDEX idx_page_views_popularity ON user_page_views (page_path, viewed_at DESC);
```

### 12.2 Alteracao na Tabela `users`

Adicionar coluna para rastrear ultima atividade sem precisar de JOIN.

```sql
-- Adicionar coluna de ultima atividade
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Index para ordenacao por atividade recente
CREATE INDEX idx_users_last_activity ON users (last_activity_at DESC NULLS LAST);
```

### 12.3 Funcao de Cleanup

```sql
CREATE OR REPLACE FUNCTION cleanup_old_page_views(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_page_views
    WHERE viewed_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 13. Regras de Negocio - User Activity

### 13.1 Session ID

- Gerado no browser usando `sessionStorage`
- Formato sugerido: `{timestamp}-{random_string}`
- Persiste enquanto a aba estiver aberta
- Permite agrupar page views de uma mesma sessao de navegacao

```typescript
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('pageTrackingSessionId');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('pageTrackingSessionId', sessionId);
  }
  return sessionId;
}
```

### 13.2 Page Titles

Mapear rotas para titulos legiveis:

```typescript
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/viagens': 'Viagens',
  '/relatorios': 'Relatorios',
  '/admin/users': 'Usuarios',
  '/admin/metrics': 'Metricas do Sistema',
  '/admin/user-activity': 'Atividade de Usuarios',
  // ... adicionar todas as rotas do sistema
};
```

### 13.3 Captura Automatica

- O tracking DEVE ser automatico (usuario nao precisa fazer nada)
- Usar Provider/HOC que intercepta mudancas de rota
- NAO trackear a mesma pagina em sequencia (evitar duplicatas)
- NAO bloquear navegacao se o tracking falhar (fire-and-forget)

### 13.4 Metricas Calculadas

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| `totalLogins` | Total de logins no periodo | COUNT de activity_type='login' |
| `totalPageViews` | Total de paginas visitadas | COUNT de page_views |
| `totalSessionTimeMinutes` | Tempo total online | SUM de time_on_page_ms / 60000 |
| `activeDays` | Dias distintos com atividade | COUNT DISTINCT de DATE_TRUNC('day', viewed_at) |
| `avgSessionMinutes` | Media de tempo por sessao | totalSessionTimeMinutes / totalLogins |

### 13.5 Filtros do Ranking

| Filtro | Descricao | Valores |
|--------|-----------|---------|
| `timeRange` | Periodo de analise | `last_hour` a `last_30d` |
| `role` | Filtrar por cargo | `admin`, `operator`, etc |
| `setorId` | Filtrar por setor | ID numerico |
| `search` | Busca por nome/username | String (ILIKE) |
| `sortBy` | Ordenacao | `lastLogin`, `totalLogins`, `totalPageViews`, `sessionTime` |
| `sortOrder` | Direcao | `asc`, `desc` |
| `page` | Paginacao | Numero (1-based) |
| `limit` | Itens por pagina | Numero (max 100) |

---

## 14. Componentes Backend - User Activity

### 14.1 User Activity Metrics Service

Responsavel pelas queries de atividade de usuarios.

**Metodos:**

#### logPageView(data: PageViewData)
```typescript
interface PageViewData {
  userId: number;
  pagePath: string;
  pageTitle?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrerPath?: string | null;
}
```

#### logPageViewAsync(data: PageViewData)
Versao assincrona que nao bloqueia a resposta.

#### getUserActivityRanking(filters: RankingFilters)

```sql
WITH user_logins AS (
  SELECT
    user_id,
    COUNT(*) as total_logins,
    MAX(timestamp) as last_login_at
  FROM user_activity_logs
  WHERE activity_type = 'login'
    AND timestamp >= $start AND timestamp <= $end
  GROUP BY user_id
),
user_pages AS (
  SELECT
    user_id,
    COUNT(*) as total_page_views,
    COUNT(DISTINCT DATE_TRUNC('day', viewed_at)) as active_days,
    COALESCE(SUM(time_on_page_ms) / 60000.0, 0) as total_session_minutes
  FROM user_page_views
  WHERE viewed_at >= $start AND viewed_at <= $end
  GROUP BY user_id
)
SELECT
  u.id as user_id,
  u.username,
  u.full_name,
  u.role,
  s.nome as setor,
  ul.last_login_at,
  u.last_activity_at,
  COALESCE(ul.total_logins, 0) as total_logins,
  COALESCE(up.total_page_views, 0) as total_page_views,
  COALESCE(up.total_session_minutes, 0) as total_session_minutes,
  COALESCE(up.active_days, 0) as active_days
FROM users u
LEFT JOIN user_logins ul ON u.id = ul.user_id
LEFT JOIN user_pages up ON u.id = up.user_id
LEFT JOIN setores s ON u.setor_id = s.id
WHERE u.is_active = true
  -- Filtros dinamicos aqui
ORDER BY $sortColumn $sortOrder
LIMIT $limit OFFSET $offset
```

#### getUserActivityDetail(userId: number, timeRange: TimeRange)

Retorna detalhes completos de um usuario especifico:

```typescript
interface UserActivityDetail {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    role: string;
    setor: string | null;
    isActive: boolean;
    createdAt: string;
  };
  activity: {
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastActivityAt: string | null;
    totalLogins: number;
    totalPageViews: number;
    totalSessionTimeMinutes: number;
    activeDays: number;
    avgSessionMinutes: number;
  };
  topPages: UserTopPage[];
  recentLogins: UserLoginHistory[];
  activityOverTime: UserActivityOverTime[];
}
```

#### Query: Top Pages do Usuario

```sql
SELECT
  page_path,
  page_title,
  COUNT(*) as view_count,
  COALESCE(SUM(time_on_page_ms) / 60000.0, 0) as total_time_minutes,
  MAX(viewed_at) as last_visited
FROM user_page_views
WHERE user_id = $userId
  AND viewed_at >= $start AND viewed_at <= $end
GROUP BY page_path, page_title
ORDER BY view_count DESC
LIMIT $limit
```

#### Query: Historico de Logins

```sql
WITH logins AS (
  SELECT
    id,
    timestamp as login_at,
    ip_address,
    user_agent,
    LEAD(timestamp) OVER (ORDER BY timestamp) as next_event_time,
    LEAD(activity_type) OVER (ORDER BY timestamp) as next_event_type
  FROM user_activity_logs
  WHERE user_id = $userId AND activity_type IN ('login', 'logout')
  ORDER BY timestamp DESC
)
SELECT
  login_at,
  CASE WHEN next_event_type = 'logout' THEN next_event_time ELSE NULL END as logout_at,
  CASE
    WHEN next_event_type = 'logout'
    THEN EXTRACT(EPOCH FROM (next_event_time - login_at)) / 60
    ELSE NULL
  END as session_duration_minutes,
  ip_address,
  user_agent
FROM logins
WHERE id IN (SELECT id FROM user_activity_logs WHERE user_id = $userId AND activity_type = 'login' LIMIT $limit)
ORDER BY login_at DESC
```

#### Query: Atividade ao Longo do Tempo

```sql
WITH dates AS (
  SELECT generate_series(
    DATE_TRUNC('day', $start AT TIME ZONE 'America/Sao_Paulo'),
    DATE_TRUNC('day', $end AT TIME ZONE 'America/Sao_Paulo'),
    '1 day'::interval
  )::date as date
),
daily_logins AS (
  SELECT
    DATE_TRUNC('day', timestamp AT TIME ZONE 'America/Sao_Paulo')::date as date,
    COUNT(*) as logins
  FROM user_activity_logs
  WHERE user_id = $userId AND activity_type = 'login'
    AND timestamp >= $start AND timestamp <= $end
  GROUP BY 1
),
daily_pages AS (
  SELECT
    DATE_TRUNC('day', viewed_at AT TIME ZONE 'America/Sao_Paulo')::date as date,
    COUNT(*) as page_views,
    COALESCE(SUM(time_on_page_ms) / 60000.0, 0) as session_minutes
  FROM user_page_views
  WHERE user_id = $userId
    AND viewed_at >= $start AND viewed_at <= $end
  GROUP BY 1
)
SELECT
  d.date,
  COALESCE(dl.logins, 0) as logins,
  COALESCE(dp.page_views, 0) as page_views,
  COALESCE(dp.session_minutes, 0) as session_minutes
FROM dates d
LEFT JOIN daily_logins dl ON d.date = dl.date
LEFT JOIN daily_pages dp ON d.date = dp.date
ORDER BY d.date ASC
```

---

## 15. API Contract - User Activity

### 15.1 Endpoints

#### GET /api/admin/metrics/users

Retorna ranking de usuarios com atividade.

**Query Parameters:**
| Param | Tipo | Obrigatorio | Default | Descricao |
|-------|------|-------------|---------|-----------|
| timeRange | string | Nao | `last_7d` | Periodo de analise |
| role | string | Nao | - | Filtrar por cargo |
| setorId | number | Nao | - | Filtrar por setor |
| search | string | Nao | - | Busca por nome/username |
| sortBy | string | Nao | `lastLogin` | Campo de ordenacao |
| sortOrder | string | Nao | `desc` | Direcao da ordenacao |
| page | number | Nao | 1 | Pagina atual |
| limit | number | Nao | 20 | Itens por pagina (max 100) |

**Response:**
```typescript
interface UserActivityRankingResponse {
  users: Array<{
    userId: number;
    username: string;
    fullName: string;
    role: string;
    setor: string | null;
    lastLoginAt: string | null;
    lastActivityAt: string | null;
    totalLogins: number;
    totalPageViews: number;
    totalSessionTimeMinutes: number;
    activeDays: number;
    avgSessionMinutes: number;
  }>;
  totalUsers: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
}
```

#### GET /api/admin/metrics/users/:id

Retorna detalhes de atividade de um usuario especifico.

**Path Parameters:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| id | number | ID do usuario |

**Query Parameters:**
| Param | Tipo | Obrigatorio | Default |
|-------|------|-------------|---------|
| timeRange | string | Nao | `last_30d` |

**Response:**
```typescript
interface UserActivityDetailResponse {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    role: string;
    setor: string | null;
    isActive: boolean;
    createdAt: string;
  };
  activity: {
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastActivityAt: string | null;
    totalLogins: number;
    totalPageViews: number;
    totalSessionTimeMinutes: number;
    activeDays: number;
    avgSessionMinutes: number;
  };
  topPages: Array<{
    pagePath: string;
    pageTitle: string | null;
    viewCount: number;
    totalTimeMinutes: number;
    lastVisited: string;
  }>;
  recentLogins: Array<{
    loginAt: string;
    logoutAt: string | null;
    sessionDurationMinutes: number | null;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  activityOverTime: Array<{
    date: string;
    logins: number;
    pageViews: number;
    sessionMinutes: number;
  }>;
}
```

#### POST /api/metrics/page-view

Registra uma visualizacao de pagina. **Disponivel para todos os usuarios autenticados.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```typescript
interface PageViewRequest {
  pagePath: string;        // Obrigatorio
  pageTitle?: string;      // Opcional
  sessionId?: string;      // Opcional
  referrerPath?: string;   // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Page view logged",
  "timestamp": "2025-12-17T12:00:00.000Z"
}
```

**Comportamento:**
- Este endpoint NAO requer permissao administrativa
- O user_id e extraido do token JWT
- O IP e User-Agent sao capturados dos headers
- O registro e salvo de forma ASSINCRONA (nao bloqueia resposta)
- Falhas sao silenciosas (nao afetam a navegacao do usuario)

---

## 16. Componentes Frontend - User Activity

### 16.1 Arquitetura de Componentes

```
UserActivityPage
├── UserActivitySummaryCards    (4 cards: total, ativos, inativos, engajamento)
├── FilterBar
│   ├── TimeRangeSelector       (Reutilizado do Metrics Dashboard)
│   ├── SearchInput             (Busca por nome/username)
│   └── RoleSelect              (Filtro por cargo)
├── UserActivityRankingTable    (Tabela com ranking e ordenacao)
└── UserDetailModal             (Modal com detalhes do usuario)
    ├── UserInfoCard            (Dados do usuario)
    ├── ActivityStatsCards      (4 mini cards de estatisticas)
    └── Tabs
        ├── ActivityTab         (Grafico de atividade)
        ├── PagesTab            (Tabela de paginas visitadas)
        └── LoginsTab           (Tabela de historico de logins)
```

### 16.2 Page Tracking Provider

Componente que deve envolver a aplicacao para rastrear navegacao.

```typescript
// Usar no App.tsx ou layout principal
function App() {
  return (
    <AuthProvider>
      <Router>
        <PageTrackingProvider>
          <Routes />
        </PageTrackingProvider>
      </Router>
    </AuthProvider>
  );
}
```

**Comportamento do Provider:**
1. Escuta mudancas de rota (useLocation, router events)
2. Verifica se usuario esta autenticado
3. Evita tracking duplicado da mesma pagina
4. Envia POST para /api/metrics/page-view
5. Armazena pagina anterior para referrer

### 16.3 Hook useUserActivityRanking

```typescript
function useUserActivityRanking(options?: {
  initialTimeRange?: TimeRange;
  initialSortBy?: SortBy;
  initialLimit?: number;
}) {
  const [filters, setFilters] = useState<Filters>(/* ... */);

  const query = useQuery({
    queryKey: ['userActivityRanking', filters],
    queryFn: () => userActivityService.getUserActivityRanking(filters),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    filters,
    setTimeRange,
    setSearch,
    setSortBy,
    setRole,
    // ...
  };
}
```

### 16.4 Hook useUserActivityDetail

```typescript
function useUserActivityDetail(userId: number | null, timeRange: TimeRange) {
  return useQuery({
    queryKey: ['userActivityDetail', userId, timeRange],
    queryFn: () => userActivityService.getUserActivityDetail(userId!, timeRange),
    enabled: userId !== null,
    staleTime: 30 * 1000,
  });
}
```

### 16.5 Componentes Detalhados

#### UserActivitySummaryCards

| Card | Dado | Cor Sugerida |
|------|------|--------------|
| Total de Usuarios | `totalUsers` | Azul |
| Usuarios Ativos | `activeUsersCount` + percentual | Verde |
| Usuarios Inativos | `inactiveUsersCount` | Laranja |
| Taxa de Engajamento | `(ativos / total) * 100`% | Roxo |

#### UserActivityRankingTable

| Coluna | Campo | Ordenavel |
|--------|-------|-----------|
| Usuario | fullName + username | Nao |
| Cargo | role (badge) | Nao |
| Setor | setor | Nao |
| Ultimo Login | lastLoginAt (relativo) | Sim |
| Logins | totalLogins | Sim |
| Paginas | totalPageViews | Sim |
| Tempo | totalSessionTimeMinutes (formatado) | Sim |
| Dias Ativos | activeDays | Nao |
| Acoes | Botao "Ver" | - |

**Formatacao de Tempo:**
```typescript
function formatMinutes(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${Math.round(minutes % 60)}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
```

#### UserDetailModal

**Abas:**

1. **Atividade**: Grafico de barras mostrando logins e page views por dia
2. **Paginas**: Tabela das paginas mais visitadas com contagem e tempo
3. **Logins**: Tabela do historico de logins com IP, duracao, dispositivo

**Grafico de Atividade:**
- Tipo: Bar Chart agrupado
- Series: logins (azul), pageViews (verde)
- Eixo X: Data (dd/MM)
- Eixo Y: Contagem

---

## 17. Checklist de Implementacao - User Activity

### Database
- [ ] Criar tabela `user_page_views`
- [ ] Criar indexes de performance
- [ ] Adicionar coluna `last_activity_at` em users
- [ ] Criar funcao `cleanup_old_page_views`
- [ ] Configurar job de cleanup

### Backend - Servicos
- [ ] Criar UserActivityMetricsService
  - [ ] `logPageView` e `logPageViewAsync`
  - [ ] `getUserActivityRanking`
  - [ ] `getUserActivityDetail`
- [ ] Criar DTOs de validacao

### Backend - API
- [ ] Criar endpoint GET /api/admin/metrics/users
- [ ] Criar endpoint GET /api/admin/metrics/users/:id
- [ ] Criar endpoint POST /api/metrics/page-view
- [ ] Aplicar autenticacao em todos
- [ ] Aplicar autorizacao admin nos GETs

### Frontend - Infraestrutura
- [ ] Criar types para User Activity
- [ ] Criar userActivityService
- [ ] Criar useUserActivityRanking hook
- [ ] Criar useUserActivityDetail hook
- [ ] Criar usePageTracking hook
- [ ] Criar PageTrackingProvider

### Frontend - Componentes
- [ ] UserActivitySummaryCards
- [ ] UserActivityRankingTable (com ordenacao)
- [ ] UserDetailModal
  - [ ] UserInfoCard
  - [ ] ActivityChart (grafico de barras)
  - [ ] TopPagesTable
  - [ ] LoginHistoryTable

### Frontend - Pagina e Navegacao
- [ ] Criar UserActivityPage
- [ ] Adicionar rota /admin/user-activity
- [ ] Adicionar item no menu (admin only)
- [ ] Integrar PageTrackingProvider no App

---

## 18. Extensoes Futuras - User Activity

1. **Exportar Relatorio**: Gerar PDF/Excel com relatorio de atividade
2. **Alertas de Inatividade**: Notificar quando usuario fica X dias sem acessar
3. **Comparacao entre Periodos**: Comparar engajamento de diferentes periodos
4. **Heatmap de Horarios**: Visualizar horarios de maior uso por usuario
5. **Tempo Real por Pagina**: Medir tempo exato usando eventos de visibilidade
6. **Sessoes Detalhadas**: Agrupar page views por sessao com timeline
7. **Filtro por Setor**: Dashboard separado por setor/departamento
8. **Metas de Engajamento**: Definir e acompanhar metas de uso

---

## 19. Captura Correta do IP do Usuario

### 19.1 O Problema

Em ambientes de producao, a aplicacao geralmente esta atras de:
- **Reverse Proxy** (Nginx, Apache, Caddy)
- **Load Balancer** (AWS ALB, HAProxy, Traefik)
- **CDN** (Cloudflare, CloudFront, Fastly)
- **API Gateway** (Kong, AWS API Gateway)

Nesses cenarios, o IP que chega no socket da aplicacao e o IP do proxy/load balancer, NAO o IP real do usuario.

```
[Usuario: 189.10.20.30]
        │
        ▼
[Cloudflare: 104.16.xxx.xxx]
        │
        ▼
[Load Balancer: 10.0.0.1]
        │
        ▼
[Aplicacao] ← Ve IP 10.0.0.1 (ERRADO!)
```

### 19.2 Headers de IP Real

Os proxies adicionam headers com o IP original do cliente:

| Header | Descricao | Usado por |
|--------|-----------|-----------|
| `X-Forwarded-For` | Lista de IPs (cliente, proxies) | Padrao de fato, maioria dos proxies |
| `X-Real-IP` | IP unico do cliente | Nginx |
| `CF-Connecting-IP` | IP do cliente | Cloudflare |
| `True-Client-IP` | IP do cliente | Akamai, Cloudflare Enterprise |
| `X-Client-IP` | IP do cliente | Alguns load balancers |
| `Forwarded` | Padrao RFC 7239 (novo) | Proxies modernos |

### 19.3 Formato do X-Forwarded-For

```
X-Forwarded-For: <client>, <proxy1>, <proxy2>, ...
```

**Exemplo:**
```
X-Forwarded-For: 189.10.20.30, 104.16.50.100, 10.0.0.1
                 ↑ IP real     ↑ Cloudflare    ↑ LB interno
```

O **primeiro IP** da lista e o IP do cliente original.

### 19.4 Algoritmo de Extracao

```typescript
function getClientIp(request: Request): string | null {
  // 1. Cloudflare (mais confiavel se usar CF)
  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.trim();
  }

  // 2. X-Real-IP (Nginx)
  const xRealIp = request.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // 3. X-Forwarded-For (padrao)
  const xForwardedFor = request.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const forwardedFor = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    // Pega o PRIMEIRO IP da lista (IP do cliente original)
    const clientIp = forwardedFor.split(',')[0].trim();
    if (clientIp) {
      return clientIp;
    }
  }

  // 4. True-Client-IP (Akamai, CF Enterprise)
  const trueClientIp = request.headers['true-client-ip'];
  if (trueClientIp && typeof trueClientIp === 'string') {
    return trueClientIp.trim();
  }

  // 5. Fallback: IP do socket (conexao direta)
  const socketIp = request.socket?.remoteAddress
    || request.connection?.remoteAddress
    || request.ip;

  // Remove prefixo IPv6 de enderecos IPv4 mapeados
  if (socketIp?.startsWith('::ffff:')) {
    return socketIp.substring(7);
  }

  return socketIp || null;
}
```

### 19.5 Implementacao por Framework

#### NestJS

```typescript
// src/common/decorators/client-ip.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return getClientIp(request);
  },
);

// Uso no controller:
@Post('login')
async login(@ClientIp() clientIp: string | null, @Body() dto: LoginDto) {
  await this.authService.login(dto, clientIp);
}
```

#### Express / Fastify

```typescript
// Middleware para adicionar ip real ao request
app.use((req, res, next) => {
  req.clientIp = getClientIp(req);
  next();
});

// Ou usar pacote trust-proxy
app.set('trust proxy', true); // Express
// Fastify: fastify.register(require('@fastify/request-ip'));
```

#### Middleware de Metricas (Exemplo Real)

```typescript
// src/metrics/middleware/request-metrics.middleware.ts
@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = randomUUID();

    // Captura IP corretamente
    const clientIp = this.getClientIp(req);

    res.on('finish', () => {
      this.requestLoggerService.logRequestAsync({
        requestId,
        ipAddress: clientIp,  // IP real do usuario
        // ... outros campos
      });
    });

    next();
  }

  private getClientIp(req: Request): string | null {
    // Implementacao completa conforme secao 19.4
  }
}
```

### 19.6 Seguranca: Trust Proxy

**IMPORTANTE**: Nunca confie cegamente nos headers X-Forwarded-For em ambientes onde usuarios podem enviar requisicoes diretamente para a aplicacao.

Um atacante pode enviar:
```
X-Forwarded-For: 127.0.0.1
```

Para se passar por localhost ou outro IP.

**Solucoes:**

1. **Validar IP do proxy**: So aceitar headers de IPs de proxies conhecidos

```typescript
const TRUSTED_PROXIES = [
  '10.0.0.0/8',      // Rede interna
  '172.16.0.0/12',   // Docker
  '192.168.0.0/16',  // Rede local
  '104.16.0.0/12',   // Cloudflare
  '173.245.48.0/20', // Cloudflare
];

function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXIES.some(cidr => isIpInCidr(ip, cidr));
}

function getClientIp(req: Request): string | null {
  const socketIp = req.socket?.remoteAddress;

  // So confia em headers se vier de proxy conhecido
  if (socketIp && isTrustedProxy(socketIp)) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip'] as string
      || socketIp;
  }

  return socketIp || null;
}
```

2. **Usar header especifico do provedor**: CF-Connecting-IP so pode ser setado pelo Cloudflare

3. **Firewall**: Bloquear acesso direto a aplicacao, forcando trafego pelo proxy

### 19.7 Configuracao de Proxies Populares

#### Nginx

```nginx
location / {
    proxy_pass http://backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Cloudflare

Cloudflare automaticamente adiciona:
- `CF-Connecting-IP`: IP do visitante
- `X-Forwarded-For`: IP do visitante + IPs de proxies

**Restaurar IP real no Nginx com Cloudflare:**
```nginx
# /etc/nginx/conf.d/cloudflare.conf
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
# ... outros ranges do CF
real_ip_header CF-Connecting-IP;
```

#### AWS Application Load Balancer

ALB adiciona automaticamente o header `X-Forwarded-For`.

```typescript
// NestJS com ALB
app.set('trust proxy', true);
```

### 19.8 Validacao de IP

Validar que o IP capturado e um IP valido:

```typescript
function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 simplificado
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function getClientIp(req: Request): string | null {
  const ip = extractIpFromHeaders(req);

  if (ip && isValidIp(ip)) {
    return ip;
  }

  return req.socket?.remoteAddress || null;
}
```

### 19.9 Armazenamento no Banco

O PostgreSQL tem o tipo `INET` otimizado para IPs:

```sql
-- Armazena IPv4 e IPv6
ip_address INET

-- Queries eficientes
SELECT * FROM logs WHERE ip_address = '189.10.20.30';
SELECT * FROM logs WHERE ip_address << '189.10.0.0/16'; -- Subnet
```

### 19.10 Resumo de Boas Praticas

| Pratica | Descricao |
|---------|-----------|
| Usar header do provedor | `CF-Connecting-IP` para Cloudflare, etc |
| Fallback para X-Forwarded-For | Primeiro IP da lista |
| Validar IP do proxy | So confiar em headers de proxies conhecidos |
| Validar formato do IP | Regex para IPv4/IPv6 |
| Usar tipo INET | PostgreSQL armazena IPs de forma otimizada |
| Logar sempre | Registrar IP em logins e acoes importantes |
| Considerar LGPD | IPs sao dados pessoais - definir retencao |

### 19.11 Configuracao de Infraestrutura (OBRIGATORIO para Deploy)

**IMPORTANTE**: O codigo sozinho NAO resolve o problema de captura de IP. E necessario configurar a infraestrutura corretamente em producao.

#### Passo 1: Habilitar Trust Proxy no Backend

O framework web (Fastify, Express, NestJS) precisa ser configurado para confiar nos headers de proxy.

**Fastify (docker-compose.prod.yml):**
```yaml
telemetria-backend:
  environment:
    # ... outras variaveis
    TRUST_PROXY: true  # OBRIGATORIO para capturar IP real
```

**Express:**
```typescript
app.set('trust proxy', true);
```

**NestJS (main.ts):**
```typescript
const app = await NestFactory.create(AppModule);
app.set('trust proxy', true);
```

**O que TRUST_PROXY faz:**
- Habilita o framework a ler headers `X-Forwarded-*`
- Faz `request.ip` retornar o IP do header ao inves do socket
- Sem isso, o framework ignora os headers e retorna o IP do proxy interno

#### Passo 2: Configurar Proxy Reverso (Nginx)

O proxy deve passar os headers com o IP original do cliente:

```nginx
server {
    listen 80;
    server_name api.exemplo.com.br;

    location / {
        proxy_pass http://localhost:3333;

        # Headers OBRIGATORIOS para IP real
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

**Sem esses headers:** O backend recebe requisicoes mas nao sabe o IP original.

#### Passo 3: Cloudflare (se aplicavel)

Se usar Cloudflare como CDN/proxy, o IP real vem no header `CF-Connecting-IP`.

O codigo do backend ja deve verificar esse header com prioridade:

```typescript
private getClientIp(request: Request): string | null {
  // 1. Cloudflare (prioridade maxima)
  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp) return cfConnectingIp;

  // 2. X-Real-IP (Nginx)
  const xRealIp = request.headers['x-real-ip'];
  if (xRealIp) return xRealIp;

  // 3. X-Forwarded-For (padrao)
  const xff = request.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();

  // 4. Fallback
  return request.ip || null;
}
```

#### Checklist de Verificacao

```bash
# 1. Verificar se TRUST_PROXY esta habilitado
docker exec <container-backend> printenv | grep TRUST_PROXY
# Esperado: TRUST_PROXY=true

# 2. Testar se headers estao chegando
curl -H "X-Forwarded-For: 189.50.100.200" http://localhost:3333/health -v

# 3. Verificar IPs no banco de dados
docker exec <container-postgres> psql -U <user> -d <db> \
  -c "SELECT DISTINCT ip_address FROM user_page_views ORDER BY ip_address LIMIT 10;"
```

#### Troubleshooting

| Sintoma | Causa Provavel | Solucao |
|---------|----------------|---------|
| Todos IPs sao `10.x.x.x` ou `172.x.x.x` | TRUST_PROXY=false ou ausente | Adicionar `TRUST_PROXY: true` no docker-compose |
| IPs sao IP do servidor (ex: `192.168.1.100`) | Nginx nao passa headers | Adicionar `proxy_set_header X-Real-IP` no Nginx |
| IPs aparecem como `::ffff:10.x.x.x` | IPv6-mapped IPv4 | Normal, o IP real esta apos `::ffff:` |
| IP aparece com `/32` (ex: `189.10.20.30/32`) | Tipo INET do PostgreSQL | Tratar no frontend com `.replace(/\/\d+$/, '')` |
| IP sempre `127.0.0.1` | Requisicao local sem proxy | Esperado em desenvolvimento |

#### Ordem de Prioridade dos Headers

O backend deve verificar os headers nesta ordem:

1. `CF-Connecting-IP` - Cloudflare (mais confiavel se usar CF)
2. `X-Real-IP` - Nginx
3. `X-Forwarded-For` - Padrao (primeiro IP da lista)
4. `request.ip` / `socket.remoteAddress` - Fallback (IP do proxy)

---

**Documento gerado em**: 2025-12-17
**Versao**: 2.2.0
**Changelog**:
- v1.0.0: Documentacao inicial do System Metrics Dashboard
- v2.0.0: Adicao do modulo User Activity Dashboard (Secoes 11-18)
- v2.1.0: Adicao da secao de Captura Correta de IP (Secao 19)
- v2.2.0: Adicao de configuracao de infraestrutura para IP real (Secao 19.11)
