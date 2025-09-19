-- ==========================================
-- 🗄️ SCRIPT DE INICIALIZAÇÃO DO BANCO
-- ==========================================

-- Configurar encoding e locale
SET client_encoding = 'UTF8';
SET timezone = 'America/Sao_Paulo';

-- Log inicial
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🚀 Iniciando configuração do banco telemetriaPioneira_db';
    RAISE NOTICE '==========================================';
END $$;

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verificar se extensão pg_stat_statements está disponível
DO $$
BEGIN
    -- Tentar criar a extensão pg_stat_statements se disponível
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
        RAISE NOTICE '✅ Extensão pg_stat_statements criada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ pg_stat_statements não disponível (normal em desenvolvimento)';
    END;
END $$;

-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS public;

-- Configurar permissões para o usuário telemetria de forma segura
DO $$
BEGIN
    -- Verificar se o usuário telemetria existe
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'telemetria') THEN
        BEGIN
            -- Dar permissões no schema public
            GRANT ALL PRIVILEGES ON SCHEMA public TO telemetria;
            
            -- Dar permissões em tabelas existentes
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO telemetria;
            
            -- Dar permissões em sequências existentes
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO telemetria;
            
            -- Dar permissões em funções existentes
            GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO telemetria;
            
            -- Dar permissões padrão para objetos futuros
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO telemetria;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO telemetria;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO telemetria;
            
            RAISE NOTICE '✅ Permissões configuradas para usuário telemetria';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao configurar permissões: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Usuário telemetria não encontrado';
    END IF;
END $$;

-- Verificar e criar tipos ENUM de forma segura
DO $$ 
BEGIN
    -- Criar user_role se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator', 'viewer');
        RAISE NOTICE '✅ Tipo user_role criado';
    ELSE
        RAISE NOTICE '⚠️ Tipo user_role já existe';
    END IF;
    
    -- Criar user_status se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
        RAISE NOTICE '✅ Tipo user_status criado';
    ELSE
        RAISE NOTICE '⚠️ Tipo user_status já existe';
    END IF;
END $$;

-- Configurações de performance (apenas se possível)
DO $$
BEGIN
    -- Tentar configurar parâmetros de performance
    BEGIN
        -- Configurações que podem funcionar em Docker
        PERFORM set_config('log_statement', 'none', false);
        PERFORM set_config('log_min_duration_statement', '1000', false);
        RAISE NOTICE '✅ Configurações básicas de performance aplicadas';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Configurações de performance não aplicadas: %', SQLERRM;
    END;
END $$;

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar função de limpeza de tokens expirados (placeholder melhorado)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Esta função será implementada pela aplicação
    -- Por enquanto, apenas registra que foi chamada
    RAISE NOTICE 'Função cleanup_expired_tokens executada em %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Criar função para verificar saúde do banco
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE(
    status text,
    database_name text,
    current_connections integer,
    max_connections integer,
    uptime interval
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'healthy'::text as status,
        current_database()::text as database_name,
        (SELECT count(*) FROM pg_stat_activity)::integer as current_connections,
        current_setting('max_connections')::integer as max_connections,
        (NOW() - pg_postmaster_start_time()) as uptime;
END;
$$ LANGUAGE plpgsql;

-- Criar view para estatísticas do banco
CREATE OR REPLACE VIEW db_stats AS
SELECT 
    current_database() as database_name,
    current_timestamp as initialized_at,
    version() as postgres_version,
    current_user as current_user,
    current_setting('timezone') as timezone,
    current_setting('client_encoding') as encoding,
    (SELECT count(*) FROM pg_extension) as extensions_count,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables_count,
    (SELECT count(*) FROM pg_type WHERE typtype = 'e') as enum_types_count;

-- Criar tabela de usuários
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

-- Criar índices para performance
DO $$
BEGIN
    -- Índices para consultas frequentes (apenas se não existirem)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role') THEN
        CREATE INDEX idx_users_role ON users(role);
        RAISE NOTICE '✅ Índice idx_users_role criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_status') THEN
        CREATE INDEX idx_users_status ON users(status);
        RAISE NOTICE '✅ Índice idx_users_status criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_verified') THEN
        CREATE INDEX idx_users_email_verified ON users(email_verified);
        RAISE NOTICE '✅ Índice idx_users_email_verified criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_created_at') THEN
        CREATE INDEX idx_users_created_at ON users(created_at);
        RAISE NOTICE '✅ Índice idx_users_created_at criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_last_login_at') THEN
        CREATE INDEX idx_users_last_login_at ON users(last_login_at);
        RAISE NOTICE '✅ Índice idx_users_last_login_at criado';
    END IF;
END $$;

-- Criar trigger para updated_at
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

-- Inserir usuário admin padrão (apenas se não existir)
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

-- Criar views úteis
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

-- Adicionar constraints de integridade
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

-- Log de inicialização detalhado
DO $$
DECLARE
    ext_count integer;
    table_count integer;
    user_count integer;
    admin_count integer;
BEGIN
    -- Contar extensões
    SELECT COUNT(*) INTO ext_count 
    FROM pg_extension 
    WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements');
    
    -- Contar tabelas
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    -- Contar usuários
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Banco de dados telemetriaPioneira_db inicializado!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 Informações do banco:';
    RAISE NOTICE '   🗄️ Database: %', current_database();
    RAISE NOTICE '   �� Usuário atual: %', current_user;
    RAISE NOTICE '   🔧 Extensões instaladas: %', ext_count;
    RAISE NOTICE '   📋 Tabelas criadas: %', table_count;
    RAISE NOTICE '   👥 Usuários cadastrados: %', user_count;
    RAISE NOTICE '   👑 Administradores: %', admin_count;
    RAISE NOTICE '   🕐 Timezone: %', current_setting('timezone');
    RAISE NOTICE '   �� Encoding: %', current_setting('client_encoding');
    RAISE NOTICE '   🐘 PostgreSQL: %', split_part(version(), ' ', 2);
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🚀 Pronto para receber a aplicação!';
    RAISE NOTICE '==========================================';
END $$;

-- Executar limpeza inicial
SELECT cleanup_expired_tokens();

-- Mostrar estatísticas iniciais
SELECT 'Estatísticas Iniciais do Sistema:' as info;
SELECT * FROM user_stats;
SELECT * FROM db_stats;