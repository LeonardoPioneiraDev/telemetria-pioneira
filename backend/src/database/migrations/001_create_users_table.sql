-- ==========================================
-- 🗄️ MIGRAÇÃO: Criação da tabela de usuários
-- ==========================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum para roles de usuário
CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator', 'viewer');

-- Enum para status de usuário
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados básicos
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    password TEXT NOT NULL,
    
    -- Permissões e status
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    
    -- Verificação de email
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    
    -- Autenticação e segurança
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Reset de senha
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Controle de tokens
    token_version INTEGER NOT NULL DEFAULT 1,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 📊 ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índices únicos (já criados automaticamente pelas constraints UNIQUE)
-- CREATE UNIQUE INDEX idx_users_email ON users(email);
-- CREATE UNIQUE INDEX idx_users_username ON users(username);

-- Índices para consultas frequentes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- Índices para tokens
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Índice para busca textual
CREATE INDEX idx_users_search ON users USING gin(
    to_tsvector('portuguese', 
        coalesce(full_name, '') || ' ' || 
        coalesce(email, '') || ' ' || 
        coalesce(username, '')
    )
);

-- ==========================================
-- 🔧 TRIGGERS E FUNÇÕES
-- ==========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Limpar tokens de reset de senha expirados
    UPDATE users 
    SET password_reset_token = NULL, 
        password_reset_expires = NULL
    WHERE password_reset_expires < NOW();
    
    -- Limpar tokens de verificação de email expirados
    UPDATE users 
    SET email_verification_token = NULL, 
        email_verification_expires = NULL
    WHERE email_verification_expires < NOW();
    
    -- Desbloquear contas com tempo de bloqueio expirado
    UPDATE users 
    SET locked_until = NULL, 
        login_attempts = 0
    WHERE locked_until < NOW();
    
    RAISE NOTICE 'Tokens expirados limpos com sucesso';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 👤 USUÁRIO ADMINISTRADOR PADRÃO
-- ==========================================

-- Inserir usuário admin padrão (senha será definida via variável de ambiente)
-- A senha padrão será 'Admin@123456' (hash será gerado pela aplicação)
INSERT INTO users (
    email, 
    username, 
    full_name, 
    password, 
    role, 
    status, 
    email_verified, 
    email_verified_at
) VALUES (
    'admin@sistema.com',
    'admin',
    'Administrador do Sistema',
    '$2b$12$LQv3c1yqBwEHxPuNYkGGaOzrVzqB0eHxhQNvuiQ9VHvKn5u8sJ9Fy', -- Admin@123456
    'admin',
    'active',
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- 🔍 VIEWS ÚTEIS
-- ==========================================

-- View para estatísticas de usuários
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_users,
    COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE email_verified = false) as unverified_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
    COUNT(*) FILTER (WHERE role = 'user') as regular_users,
    COUNT(*) FILTER (WHERE role = 'moderator') as moderator_users,
    COUNT(*) FILTER (WHERE role = 'viewer') as viewer_users,
    COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days') as active_last_30_days,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30_days
FROM users;

-- View para usuários ativos
CREATE OR REPLACE VIEW active_users AS
SELECT 
    id,
    email,
    username,
    full_name,
    role,
    email_verified,
    last_login_at,
    created_at
FROM users 
WHERE status = 'active' 
AND (locked_until IS NULL OR locked_until < NOW());

-- ==========================================
-- 🧹 FUNÇÃO DE LIMPEZA AUTOMÁTICA
-- ==========================================

-- Criar job para limpeza automática (se pg_cron estiver disponível)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 */6 * * *', 'SELECT cleanup_expired_tokens();');

-- ==========================================
-- 📝 COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==========================================

COMMENT ON TABLE users IS 'Tabela principal de usuários do sistema';
COMMENT ON COLUMN users.id IS 'Identificador único do usuário (UUID)';
COMMENT ON COLUMN users.email IS 'Email único do usuário';
COMMENT ON COLUMN users.username IS 'Nome de usuário único';
COMMENT ON COLUMN users.full_name IS 'Nome completo do usuário';
COMMENT ON COLUMN users.password IS 'Hash da senha do usuário (bcrypt)';
COMMENT ON COLUMN users.role IS 'Papel do usuário no sistema';
COMMENT ON COLUMN users.status IS 'Status atual da conta do usuário';
COMMENT ON COLUMN users.email_verified IS 'Se o email foi verificado';
COMMENT ON COLUMN users.login_attempts IS 'Número de tentativas de login falhadas consecutivas';
COMMENT ON COLUMN users.locked_until IS 'Data/hora até quando a conta está bloqueada';
COMMENT ON COLUMN users.token_version IS 'Versão dos tokens para invalidação em massa';

-- ==========================================
-- ✅ VERIFICAÇÕES DE INTEGRIDADE
-- ==========================================

-- Constraint para garantir que email_verified_at só seja definido se email_verified for true
ALTER TABLE users ADD CONSTRAINT check_email_verified_consistency 
    CHECK (
        (email_verified = true AND email_verified_at IS NOT NULL) OR 
        (email_verified = false AND email_verified_at IS NULL)
    );

-- Constraint para garantir que login_attempts seja não-negativo
ALTER TABLE users ADD CONSTRAINT check_login_attempts_non_negative 
    CHECK (login_attempts >= 0);

-- Constraint para garantir que token_version seja positivo
ALTER TABLE users ADD CONSTRAINT check_token_version_positive 
    CHECK (token_version > 0);

-- Constraint para email format básico
ALTER TABLE users ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Constraint para username format
ALTER TABLE users ADD CONSTRAINT check_username_format 
    CHECK (username ~* '^[a-zA-Z0-9_]+$' AND length(username) >= 3);

-- ==========================================
-- 📊 GRANTS E PERMISSÕES
-- ==========================================

-- Garantir que o usuário da aplicação tenha as permissões necessárias
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO telemetria_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO telemetria_app;

-- ==========================================
-- ✅ VERIFICAÇÃO FINAL
-- ==========================================

-- Verificar se a tabela foi criada corretamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '✅ Tabela users criada com sucesso!';
        RAISE NOTICE '📊 Total de índices criados: %', (
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'users'
        );
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar tabela users';
    END IF;
END $$;

-- Mostrar estatísticas iniciais
SELECT 'Estatísticas Iniciais:' as info;
SELECT * FROM user_stats;