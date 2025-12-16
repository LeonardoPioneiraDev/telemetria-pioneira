-- =====================================================
-- METRICS DASHBOARD - DATABASE SCHEMA
-- Timezone: America/Sao_Paulo
-- Data: 2025-12-16
-- =====================================================

-- ===========================================
-- TABLE 1: request_logs
-- Logs brutos de requisicoes (retencao 30 dias)
-- ===========================================
CREATE TABLE IF NOT EXISTS request_logs (
    id BIGSERIAL PRIMARY KEY,

    -- Identificacao da requisicao
    request_id UUID NOT NULL,

    -- Timestamp da requisicao
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Detalhes da requisicao
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    route_pattern VARCHAR(500),

    -- Contexto do usuario (nullable para requisicoes nao autenticadas)
    user_id UUID,
    user_role VARCHAR(50),

    -- Metricas de resposta
    status_code SMALLINT NOT NULL,
    latency_ms INTEGER NOT NULL,
    response_size_bytes INTEGER,

    -- Informacoes do cliente
    ip_address INET,
    user_agent TEXT,

    -- Rastreamento de erros
    error_message TEXT,
    error_code VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para request_logs
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_logs_status_code ON request_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint ON request_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_request_logs_latency ON request_logs (latency_ms DESC);

-- Index composto para queries de dashboard
CREATE INDEX IF NOT EXISTS idx_request_logs_dashboard
    ON request_logs (timestamp DESC, status_code, user_id);


-- ===========================================
-- TABLE 2: user_activity_logs
-- Registro de logins e atividades de usuarios
-- ===========================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGSERIAL PRIMARY KEY,

    -- Usuario
    user_id UUID NOT NULL,

    -- Tipo de atividade: 'login', 'logout', 'password_reset', etc
    activity_type VARCHAR(50) NOT NULL,

    -- Timestamp da atividade
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Informacoes do cliente
    ip_address INET,
    user_agent TEXT,

    -- Metadados adicionais (JSON)
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para user_activity_logs
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs (activity_type);

-- Index composto para queries de logins unicos
CREATE INDEX IF NOT EXISTS idx_user_activity_login_stats
    ON user_activity_logs (timestamp DESC, activity_type, user_id)
    WHERE activity_type = 'login';


-- ===========================================
-- FUNCTION: cleanup_old_request_logs
-- Remove logs mais antigos que o periodo de retencao
-- Uso: SELECT cleanup_old_request_logs(30);
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_request_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM request_logs
    WHERE timestamp < (NOW() AT TIME ZONE 'America/Sao_Paulo') - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Deleted % request_logs older than % days', deleted_count, retention_days;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


-- ===========================================
-- FUNCTION: cleanup_old_user_activity_logs
-- Remove logs de atividade mais antigos que o periodo de retencao
-- Uso: SELECT cleanup_old_user_activity_logs(90);
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_user_activity_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_activity_logs
    WHERE timestamp < (NOW() AT TIME ZONE 'America/Sao_Paulo') - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Deleted % user_activity_logs older than % days', deleted_count, retention_days;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE request_logs IS 'Logs de todas as requisicoes HTTP para analise de metricas';
COMMENT ON TABLE user_activity_logs IS 'Logs de atividades de usuarios (logins, logouts, etc)';
COMMENT ON FUNCTION cleanup_old_request_logs IS 'Remove logs de requisicoes mais antigos que N dias';
COMMENT ON FUNCTION cleanup_old_user_activity_logs IS 'Remove logs de atividade mais antigos que N dias';
