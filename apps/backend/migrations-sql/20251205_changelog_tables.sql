-- Migration: Changelog / What's New Feature
-- Date: 2025-12-05
-- Description: Tables for changelog entries and user read tracking

-- ============================================================================
-- 1. CHANGELOG ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS changelog_entries (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'feature' CHECK (type IN ('feature', 'improvement', 'fix')),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. USER CHANGELOG VIEWS TABLE (tracks which entries each user has seen)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_changelog_views (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changelog_entry_id INTEGER NOT NULL REFERENCES changelog_entries(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, changelog_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_user_changelog_views_user_id
ON user_changelog_views(user_id);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_published_at
ON changelog_entries(published_at DESC);

-- ============================================================================
-- 3. SEED: Initial changelog entries
-- ============================================================================
INSERT INTO changelog_entries (version, title, description, type, published_at) VALUES
('1.2.0', 'Busca por Crachá', 'Agora você pode pesquisar motoristas pelo número do crachá, além do nome.', 'feature', NOW()),
('1.2.0', 'Performance Otimizada', 'Relatórios de desempenho agora carregam até 1000x mais rápido.', 'improvement', NOW());
