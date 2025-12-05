# Feature: Changelog / What's New

## Objetivo
Modal de novidades que aparece automaticamente no login quando há atualizações não lidas. Botão no header para acessar histórico.

## Estrutura

### Banco de Dados (PostgreSQL)

```sql
-- Tabela de entradas do changelog
CREATE TABLE changelog_entries (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'feature', -- 'feature' | 'improvement' | 'fix'
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de visualizações por usuário
CREATE TABLE user_changelog_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changelog_entry_id INTEGER NOT NULL REFERENCES changelog_entries(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, changelog_entry_id)
);

CREATE INDEX idx_user_changelog_views_user_id ON user_changelog_views(user_id);
```

### Backend (NestJS/Fastify)

**Arquivos:**
- `entities/changelog-entry.entity.ts`
- `entities/user-changelog-view.entity.ts`
- `repositories/changelog.repository.ts`
- `modules/changelog/services/changelog.service.ts`
- `modules/changelog/controllers/changelog.controller.ts`
- `modules/changelog/routes/changelog.routes.ts`

**Endpoints:**
- `GET /api/changelog` - Lista todas as entradas
- `GET /api/changelog/unread` - Entradas não lidas do usuário autenticado
- `GET /api/changelog/has-unread` - Retorna `{ hasUnread: boolean, count: number }`
- `POST /api/changelog/mark-read` - Marca todas como lidas para o usuário

### Frontend (React/Next.js)

**Arquivos:**
- `components/changelog/ChangelogModal.tsx` - Modal com lista
- `components/changelog/ChangelogButton.tsx` - Botão no header com badge
- `hooks/useChangelog.ts` - React Query hooks
- `services/changelog.service.ts` - API calls
- `types/changelog.ts` - Tipos TypeScript

**Fluxo:**
1. Login → verifica `has-unread`
2. Se true → abre modal automaticamente
3. Usuário fecha → `POST /mark-read`
4. Header tem botão com badge (contador de não lidas)
5. Clique no botão → abre modal com histórico completo

### Tipos

```typescript
interface ChangelogEntry {
  id: number;
  version: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix';
  publishedAt: string;
  isRead?: boolean;
}

interface ChangelogUnreadResponse {
  hasUnread: boolean;
  count: number;
  entries: ChangelogEntry[];
}
```

## Primeira entrada (seed)

```sql
INSERT INTO changelog_entries (version, title, description, type) VALUES
('1.2.0', 'Busca por Crachá', 'Agora você pode pesquisar motoristas pelo número do crachá, além do nome.', 'feature'),
('1.2.0', 'Performance Otimizada', 'Relatórios de desempenho agora carregam até 1000x mais rápido.', 'improvement');
```
