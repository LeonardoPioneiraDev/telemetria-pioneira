# Plano: Dashboard de Metricas de Sistema (Admin)

> Arquivo de acompanhamento da implementacao. Marcar [x] conforme cada item for concluido.

## Resumo
Implementar um dashboard administrativo para monitoramento de metricas do sistema incluindo: requisicoes, latencia, taxa de erro, usuarios ativos e analise de performance por endpoint.

---

## Checklist de Implementacao

### Fase 1: Database
- [x] Criar arquivo `001_create_metrics_tables.sql` em `apps/backend/migrations-sql/`
- [ ] Entregar SQL para usuario executar no DBeaver

### Fase 2: Backend Core
- [x] Criar entidade `request-log.entity.ts`
- [x] Criar entidade `user-activity-log.entity.ts`
- [x] Registrar entidades no `data-source.ts`
- [x] Criar `RequestLoggerService` (salva logs de requisicoes)
- [x] Criar `UserActivityService` (registra logins)
- [x] Criar middleware `request-metrics.middleware.ts`
- [x] Registrar middleware no `app.ts`
- [x] Modificar `AuthService` para registrar login na user_activity_logs

### Fase 3: Backend API
- [x] Criar `types/metrics.types.ts`
- [x] Criar `schemas/metrics.schema.ts` (Zod)
- [x] Criar `MetricsService` com queries
- [x] Criar `MetricsController`
- [x] Criar `metrics.routes.ts`
- [x] Registrar rotas no `app.ts`

### Fase 4: Frontend
- [x] Criar `types/metrics.ts`
- [x] Criar `services/metrics.service.ts`
- [x] Criar hook `useMetrics.ts`
- [x] Criar `TimeRangeSelector.tsx`
- [x] Criar `MetricsSummaryCards.tsx`
- [x] Criar `RequestsOverTimeChart.tsx`
- [x] Criar `LatencyComparisonChart.tsx`
- [x] Criar `StatusCodePieChart.tsx`
- [x] Criar `DailyPeaksChart.tsx`
- [x] Criar `TopUsersTable.tsx`
- [x] Criar `SlowestEndpointsTable.tsx`
- [x] Criar pagina principal `page.tsx`
- [x] Adicionar link no menu dropdown do header (admin only)

---

## Estrutura de Arquivos a Criar

### Backend
```
apps/backend/
├── migrations-sql/
│   └── 001_create_metrics_tables.sql
└── src/
    ├── entities/
    │   ├── request-log.entity.ts
    │   └── user-activity-log.entity.ts
    └── modules/
        └── metrics/
            ├── controllers/
            │   └── metrics.controller.ts
            ├── services/
            │   ├── metrics.service.ts
            │   ├── request-logger.service.ts
            │   └── user-activity.service.ts
            ├── middleware/
            │   └── request-metrics.middleware.ts
            ├── routes/
            │   └── metrics.routes.ts
            ├── schemas/
            │   └── metrics.schema.ts
            └── types/
                └── metrics.types.ts
```

### Frontend
```
apps/frontend/src/
├── app/(dashboard)/admin/metrics/
│   ├── page.tsx
│   ├── components/
│   │   ├── MetricsSummaryCards.tsx
│   │   ├── RequestsOverTimeChart.tsx
│   │   ├── LatencyComparisonChart.tsx
│   │   ├── StatusCodePieChart.tsx
│   │   ├── TopUsersTable.tsx
│   │   ├── SlowestEndpointsTable.tsx
│   │   ├── DailyPeaksChart.tsx
│   │   └── TimeRangeSelector.tsx
│   └── hooks/
│       └── useMetrics.ts
├── services/
│   └── metrics.service.ts
└── types/
    └── metrics.ts
```

---

## Arquivos Existentes a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `apps/backend/src/data-source.ts` | Adicionar imports e entidades no array |
| `apps/backend/src/app.ts` | Registrar middleware e rotas |
| `apps/backend/src/modules/auth/services/authService.ts` | Registrar login na user_activity_logs |
| `apps/frontend/src/components/` (Header) | Adicionar link "Metricas" no dropdown |

---

## API Endpoint

```
GET /api/admin/metrics/dashboard?timeRange=last_24h

Query Params:
- timeRange: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d'

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": number,
      "avgLatencyMs": number,
      "p95LatencyMs": number,
      "errorRate": number,
      "uniqueUsers": number,
      "uniqueLoggedInUsers": number
    },
    "charts": {
      "requestsOverTime": [...],
      "statusDistribution": [...],
      "dailyPeaks": [...]
    },
    "rankings": {
      "topUsers": [...],
      "slowestEndpoints": [...]
    }
  }
}
```

---

## Consideracoes Tecnicas

- **Timezone:** Todas as queries usam `America/Sao_Paulo`
- **Performance:** Logs salvos assincronamente via `setImmediate()`
- **Seguranca:** Protecao via permission `system:metrics` (admin)
- **Retencao:** Logs mantidos por 30 dias (funcao de cleanup disponivel)

---

# Modulo 2: Dashboard de Atividade de Usuarios (Secoes 11-19)

> Expande o sistema de metricas com rastreamento de navegacao por usuario e dashboard de atividade detalhada.

## Checklist de Implementacao - User Activity

### Fase 1: Database
- [x] Criar arquivo `002_create_user_page_views.sql` em `apps/backend/migrations-sql/`
  - Tabela `user_page_views` para rastrear navegacao
  - Campo `last_activity_at` na tabela `users`
  - Funcao `cleanup_old_page_views` para limpeza automatica
- [ ] Entregar SQL para usuario executar no DBeaver

### Fase 2: Backend Core
- [x] Criar entidade `user-page-view.entity.ts`
- [x] Adicionar campo `lastActivityAt` em `user.entity.ts`
- [x] Registrar entidade no `data-source.ts`
- [x] Criar `user-activity.types.ts` (interfaces de request/response)
- [x] Criar `user-activity.schema.ts` (validacao Zod)
- [x] Criar `user-activity-metrics.service.ts`
  - `logPageView()` - registra visualizacao de pagina
  - `logPageViewAsync()` - versao async fire-and-forget
  - `getUserActivityRanking()` - ranking com filtros e paginacao
  - `getUserActivityDetail()` - detalhes de atividade de um usuario
- [x] Criar `user-activity.controller.ts` com extracao correta de IP
- [x] Criar `user-activity.routes.ts`
- [x] Registrar rotas no `app.ts`

### Fase 3: Frontend Core
- [x] Criar `types/user-activity.ts` (interfaces e constantes)
- [x] Criar `services/user-activity.service.ts`
- [x] Criar `hooks/useUserActivityRanking.ts`
- [x] Criar `hooks/useUserActivityDetail.ts`
- [x] Criar `PageTrackingContext.tsx` (provider de rastreamento)
- [x] Registrar provider em `providers.tsx`

### Fase 4: Frontend UI
- [x] Criar `UserActivitySummaryCards.tsx` (4 cards de resumo)
- [x] Criar `UserActivityRankingTable.tsx` (tabela ordenavel)
- [x] Criar `UserDetailModal.tsx` (modal com tabs: atividade, paginas, logins)
- [x] Criar `page.tsx` em `/admin/user-activity/`
- [x] Adicionar link "Atividade de Usuarios" no dropdown do header

---

## Estrutura de Arquivos - User Activity

### Backend
```
apps/backend/
├── migrations-sql/
│   └── 002_create_user_page_views.sql
└── src/
    ├── entities/
    │   └── user-page-view.entity.ts
    └── modules/
        └── metrics/
            ├── controllers/
            │   └── user-activity.controller.ts
            ├── services/
            │   └── user-activity-metrics.service.ts
            ├── routes/
            │   └── user-activity.routes.ts
            ├── schemas/
            │   └── user-activity.schema.ts
            └── types/
                └── user-activity.types.ts
```

### Frontend
```
apps/frontend/src/
├── app/(dashboard)/admin/user-activity/
│   ├── page.tsx
│   ├── components/
│   │   ├── UserActivitySummaryCards.tsx
│   │   ├── UserActivityRankingTable.tsx
│   │   └── UserDetailModal.tsx
│   └── hooks/
│       ├── useUserActivityRanking.ts
│       └── useUserActivityDetail.ts
├── contexts/
│   └── PageTrackingContext.tsx
├── services/
│   └── user-activity.service.ts
└── types/
    └── user-activity.ts
```

---

## APIs do Modulo User Activity

### 1. Ranking de Atividade
```
GET /api/admin/metrics/users

Query Params:
- timeRange: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d'
- search?: string (filtro por nome/username)
- sortBy: 'lastLogin' | 'totalLogins' | 'totalPageViews' | 'sessionTime' | 'activeDays'
- sortOrder: 'asc' | 'desc'
- page: number (default 1)
- limit: number (default 20)

Response: UserActivityRankingResponse
```

### 2. Detalhes do Usuario
```
GET /api/admin/metrics/users/:id

Query Params:
- timeRange: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d'

Response: UserActivityDetailResponse
```

### 3. Registrar Page View
```
POST /api/metrics/page-view

Body:
{
  "pagePath": string,
  "pageTitle"?: string,
  "sessionId": string,
  "referrer"?: string
}

Response: { success: true }
```

---

## Consideracoes Tecnicas - User Activity

- **Page Views:** Salvos assincronamente via `setImmediate()` (nao bloqueia response)
- **Session ID:** Gerado no frontend via `sessionStorage` (unico por aba do browser)
- **IP Capture:** Extrai de headers `X-Forwarded-For`, `CF-Connecting-IP`, `X-Real-IP`
- **Timezone:** Todas as queries usam `America/Sao_Paulo`
- **Seguranca:** Rotas admin protegidas por permission `system:metrics`
- **Exclusoes:** Paginas `/login`, `/register`, `/forgot-password` nao sao rastreadas
