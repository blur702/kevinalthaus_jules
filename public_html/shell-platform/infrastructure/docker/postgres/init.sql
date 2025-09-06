-- Shell Platform Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
SET search_path TO auth, app, audit, public;

-- Create custom types
CREATE TYPE auth.user_role AS ENUM ('super_admin', 'admin', 'user', 'guest');
CREATE TYPE auth.user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE app.resource_type AS ENUM ('file', 'image', 'document', 'video', 'other');
CREATE TYPE audit.action_type AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout');

-- Users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role auth.user_role DEFAULT 'user',
    status auth.user_status DEFAULT 'active',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE auth.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE auth.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- Role permissions table
CREATE TABLE auth.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role auth.user_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Generic data table (for CRUD operations)
CREATE TABLE app.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES app.resources(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Files table
CREATE TABLE app.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    cdn_url TEXT,
    type app.resource_type DEFAULT 'other',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    virus_scanned BOOLEAN DEFAULT FALSE,
    virus_scan_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- API keys table (for external service integration)
CREATE TABLE app.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    service_name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Audit log table
CREATE TABLE audit.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action audit.action_type NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_username ON auth.users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_status ON auth.users(status);
CREATE INDEX idx_refresh_tokens_user_id ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON auth.refresh_tokens(token);
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX idx_sessions_token ON auth.sessions(session_token);
CREATE INDEX idx_resources_owner_id ON app.resources(owner_id);
CREATE INDEX idx_resources_type ON app.resources(type);
CREATE INDEX idx_resources_parent_id ON app.resources(parent_id);
CREATE INDEX idx_files_owner_id ON app.files(owner_id);
CREATE INDEX idx_files_type ON app.files(type);
CREATE INDEX idx_api_keys_user_id ON app.api_keys(user_id);
CREATE INDEX idx_api_keys_service ON app.api_keys(service_name);
CREATE INDEX idx_audit_logs_user_id ON audit.logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit.logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit.logs(created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON app.resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON app.files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON app.api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default permissions
INSERT INTO auth.permissions (resource, action, description) VALUES
    ('users', 'create', 'Create new users'),
    ('users', 'read', 'View user information'),
    ('users', 'update', 'Update user information'),
    ('users', 'delete', 'Delete users'),
    ('resources', 'create', 'Create new resources'),
    ('resources', 'read', 'View resources'),
    ('resources', 'update', 'Update resources'),
    ('resources', 'delete', 'Delete resources'),
    ('files', 'upload', 'Upload files'),
    ('files', 'download', 'Download files'),
    ('files', 'delete', 'Delete files'),
    ('api_keys', 'create', 'Create API keys'),
    ('api_keys', 'revoke', 'Revoke API keys'),
    ('audit', 'read', 'View audit logs');

-- Grant permissions to roles
-- Super Admin gets all permissions
INSERT INTO auth.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM auth.permissions;

-- Admin gets most permissions except audit
INSERT INTO auth.role_permissions (role, permission_id)
SELECT 'admin', id FROM auth.permissions
WHERE resource != 'audit';

-- User gets basic permissions
INSERT INTO auth.role_permissions (role, permission_id)
SELECT 'user', id FROM auth.permissions
WHERE resource IN ('resources', 'files') AND action IN ('create', 'read', 'update');

-- Guest gets read-only permissions
INSERT INTO auth.role_permissions (role, permission_id)
SELECT 'guest', id FROM auth.permissions
WHERE action = 'read' AND resource IN ('resources');