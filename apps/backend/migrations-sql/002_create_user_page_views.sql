-- ============================================================================
-- Migration: 002_create_user_page_views.sql
-- Description: Cria tabela user_page_views para tracking de navegacao e
--              adiciona coluna last_activity_at na tabela users
-- Author: AI Assistant
-- Date: 2025-12-17
-- ============================================================================

-- ============================================================================
-- PARTE 1: Tabela user_page_views
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_page_views (
    id BIGSERIAL PRIMARY KEY,

    -- Usuario que visualizou a pagina
    user_id UUID NOT NULL,

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

-- Comentarios na tabela
COMMENT ON TABLE user_page_views IS 'Registros de navegacao dos usuarios pelas paginas do sistema';
COMMENT ON COLUMN user_page_views.user_id IS 'UUID do usuario que visualizou a pagina';
COMMENT ON COLUMN user_page_views.page_path IS 'Path da pagina sem query string (ex: /dashboard)';
COMMENT ON COLUMN user_page_views.page_title IS 'Titulo legivel da pagina para exibicao';
COMMENT ON COLUMN user_page_views.session_id IS 'ID unico da sessao do browser (sessionStorage)';
COMMENT ON COLUMN user_page_views.viewed_at IS 'Momento em que a pagina foi visualizada';
COMMENT ON COLUMN user_page_views.time_on_page_ms IS 'Tempo gasto na pagina em milissegundos';
COMMENT ON COLUMN user_page_views.referrer_path IS 'Path da pagina anterior (de onde o usuario veio)';

-- ============================================================================
-- PARTE 2: Indexes para performance
-- ============================================================================

-- Index para buscar por usuario
CREATE INDEX IF NOT EXISTS idx_page_views_user_id
    ON user_page_views (user_id);

-- Index para ordenar por data (queries de historico)
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at
    ON user_page_views (viewed_at DESC);

-- Index para buscar por pagina (popularidade)
CREATE INDEX IF NOT EXISTS idx_page_views_page_path
    ON user_page_views (page_path);

-- Index para buscar por sessao
CREATE INDEX IF NOT EXISTS idx_page_views_session
    ON user_page_views (session_id)
    WHERE session_id IS NOT NULL;

-- Index composto para queries de atividade do usuario
CREATE INDEX IF NOT EXISTS idx_page_views_user_activity
    ON user_page_views (user_id, viewed_at DESC);

-- Index composto para queries de popularidade de paginas por periodo
CREATE INDEX IF NOT EXISTS idx_page_views_popularity
    ON user_page_views (page_path, viewed_at DESC);

-- Index composto para dashboard (periodo + usuario)
CREATE INDEX IF NOT EXISTS idx_page_views_dashboard
    ON user_page_views (viewed_at DESC, user_id);

-- ============================================================================
-- PARTE 3: Alteracao na tabela users
-- ============================================================================

-- Adicionar coluna de ultima atividade (se nao existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMPTZ;
        COMMENT ON COLUMN users.last_activity_at IS 'Timestamp da ultima atividade do usuario no sistema';
    END IF;
END $$;

-- Index para ordenacao por atividade recente
CREATE INDEX IF NOT EXISTS idx_users_last_activity
    ON users (last_activity_at DESC NULLS LAST);

-- ============================================================================
-- PARTE 4: Funcao de Cleanup (Retencao de Dados)
-- ============================================================================

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

COMMENT ON FUNCTION cleanup_old_page_views IS 'Remove registros de page views mais antigos que N dias (padrao: 90)';

-- ============================================================================
-- PARTE 5: Foreign Key (Opcional - Descomente se quiser integridade referencial)
-- ============================================================================

-- NOTA: Se voce quiser integridade referencial, descomente a linha abaixo.
-- Isso pode impactar performance em inserts de alta frequencia.

-- ALTER TABLE user_page_views
--     ADD CONSTRAINT fk_page_views_user
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- VERIFICACAO
-- ============================================================================

-- Verificar se a tabela foi criada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_page_views') THEN
        RAISE NOTICE 'Tabela user_page_views criada com sucesso!';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_activity_at'
    ) THEN
        RAISE NOTICE 'Coluna last_activity_at adicionada em users com sucesso!';
    END IF;
END $$;

-- ============================================================================
-- EXEMPLO DE USO DO CLEANUP (executar periodicamente via CRON)
-- ============================================================================
-- SELECT cleanup_old_page_views(90);  -- Remove registros > 90 dias
-- SELECT cleanup_old_page_views(30);  -- Remove registros > 30 dias (mais agressivo)
