-- ==========================================
-- 🗄️ MIGRAÇÃO: Criação da tabela de usuários
-- ==========================================

-- Extensões necessárias (verificar se já existem)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 🔧 CRIAÇÃO SEGURA DE TIPOS ENUM
-- ==========================================

-- Verificar e criar tipos ENUM de forma segura
DO $$ 
BEGIN
    -- Criar user_role se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator', 'viewer');
        RAISE NOTICE '✅ Tipo user_role criado pela migração';
    ELSE
        RAISE NOTICE '⚠️ Tipo user_role já existe (provavelmente criado pelo script de inicialização)';
    END IF;
    
    -- Criar user_status se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
        RAISE NOTICE '✅ Tipo user_status criado pela migração';
    ELSE
        RAISE NOTICE '⚠️ Tipo user_status já existe (provavelmente criado pelo script de inicialização)';
    END IF;
END $$;

-- ==========================================
-- 📋 CRIAÇÃO DA TABELA DE USUÁRIOS
-- ==========================================

-- Tabela de usuários (criar apenas se não existir)
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
-- 📊 ÍNDICES PARA PERFORMANCE (CRIAÇÃO SEGURA)
-- ==========================================

DO $$
BEGIN
    -- Índices para consultas frequentes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role') THEN
        CREATE INDEX idx_users_role ON users(role);
        RAISE NOTICE '✅ Índice idx_users_role criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_role já existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_status') THEN
        CREATE INDEX idx_users_status ON users(status);
        RAISE NOTICE '✅ Índice idx_users_status criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_status já existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_verified') THEN
        CREATE INDEX idx_users_email_verified ON users(email_verified);
        RAISE NOTICE '✅ Índice idx_users_email_verified criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_email_verified já existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_created_at') THEN
        CREATE INDEX idx_users_created_at ON users(created_at);
        RAISE NOTICE '✅ Índice idx_users_created_at criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_created_at já existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_last_login_at') THEN
        CREATE INDEX idx_users_last_login_at ON users(last_login_at);
        RAISE NOTICE '✅ Índice idx_users_last_login_at criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_last_login_at já existe';
    END IF;
    
    -- Índices para tokens
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_password_reset_token') THEN
        CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) 
        WHERE password_reset_token IS NOT NULL;
        RAISE NOTICE '✅ Índice idx_users_password_reset_token criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_password_reset_token já existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_verification_token') THEN
        CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) 
        WHERE email_verification_token IS NOT NULL;
        RAISE NOTICE '✅ Índice idx_users_email_verification_token criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_email_verification_token já existe';
    END IF;
    
    -- Índice para busca textual
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_search') THEN
        CREATE INDEX idx_users_search ON users USING gin(
            to_tsvector('portuguese', 
                coalesce(full_name, '') || ' ' || 
                coalesce(email, '') || ' ' || 
                coalesce(username, '')
            )
        );
        RAISE NOTICE '✅ Índice idx_users_search criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_users_search já existe';
    END IF;
END $$;

-- ==========================================
-- 🔧 TRIGGERS E FUNÇÕES (CRIAÇÃO SEGURA)
-- ==========================================

-- Função para atualizar updated_at automaticamente (sempre recriar para garantir consistência)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_users_updated_at criado';
    ELSE
        RAISE NOTICE '⚠️ Trigger update_users_updated_at já existe';
    END IF;
END $$;

-- Função para limpar tokens expirados (sempre recriar para garantir consistência)
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
-- 👤 USUÁRIO ADMINISTRADOR PADRÃO (INSERÇÃO SEGURA)
-- ==========================================

-- Inserir usuário admin padrão de forma mais segura
DO $$
BEGIN
    -- Verificar se já existe um usuário admin (por email ou username)
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE email = 'admin@sistema.com' 
        OR username = 'admin'
    ) THEN
        -- Inserir usuário admin apenas se não existir
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
        );
        
        RAISE NOTICE '✅ Usuário admin criado com sucesso';
    ELSE
        RAISE NOTICE '⚠️ Usuário admin já existe (email ou username já cadastrado)';
    END IF;
END $$;

-- ==========================================
-- 🔍 VIEWS ÚTEIS (SEMPRE RECRIAR)
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
-- ✅ VERIFICAÇÕES DE INTEGRIDADE (CRIAÇÃO SEGURA)
-- ==========================================

DO $$
BEGIN
    -- Constraint para email_verified_consistency
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_email_verified_consistency 
            CHECK (
                (email_verified = true AND email_verified_at IS NOT NULL) OR 
                (email_verified = false AND email_verified_at IS NULL)
            );
        RAISE NOTICE '✅ Constraint check_email_verified_consistency criada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Constraint check_email_verified_consistency já existe';
    END;
    
    -- Constraint para login_attempts
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_login_attempts_non_negative 
            CHECK (login_attempts >= 0);
        RAISE NOTICE '✅ Constraint check_login_attempts_non_negative criada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Constraint check_login_attempts_non_negative já existe';
    END;
    
    -- Constraint para token_version
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_token_version_positive 
            CHECK (token_version > 0);
        RAISE NOTICE '✅ Constraint check_token_version_positive criada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Constraint check_token_version_positive já existe';
    END;
    
    -- Constraint para email format
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_email_format 
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
        RAISE NOTICE '✅ Constraint check_email_format criada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Constraint check_email_format já existe';
    END;
    
    -- Constraint para username format
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_username_format 
            CHECK (username ~* '^[a-zA-Z0-9_]+$' AND length(username) >= 3);
        RAISE NOTICE '✅ Constraint check_username_format criada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Constraint check_username_format já existe';
    END;
END $$;

-- ==========================================
-- ✅ VERIFICAÇÃO FINAL
-- ==========================================

-- Verificar se a tabela foi criada corretamente
DO $$
DECLARE
    table_exists boolean;
    index_count integer;
    constraint_count integer;
    user_count integer;
    admin_count integer;
BEGIN
    -- Verificar se a tabela existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Contar índices
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE tablename = 'users' AND schemaname = 'public';
        
        -- Contar constraints
        SELECT COUNT(*) INTO constraint_count
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND table_schema = 'public';
        
        -- Contar usuários
        SELECT COUNT(*) INTO user_count FROM users;
        SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
        
        RAISE NOTICE '==========================================';
        RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
        RAISE NOTICE '==========================================';
        RAISE NOTICE '📋 Tabela users: CRIADA';
        RAISE NOTICE '📊 Índices criados: %', index_count;
        RAISE NOTICE '🔒 Constraints criadas: %', constraint_count;
        RAISE NOTICE '👥 Usuários cadastrados: %', user_count;
        RAISE NOTICE '👑 Administradores: %', admin_count;
        RAISE NOTICE '==========================================';
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar tabela users';
    END IF;
END $$;

-- Mostrar estatísticas iniciais (apenas se a tabela tiver dados)
DO $$
DECLARE
    user_count integer;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Estatísticas do Sistema:';
        -- As estatísticas serão mostradas pela view user_stats
    ELSE
        RAISE NOTICE 'Nenhum usuário encontrado. Tabela criada mas vazia.';
    END IF;
END $$;

-- Executar limpeza inicial de tokens (se a função existir)
SELECT cleanup_expired_tokens();