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
