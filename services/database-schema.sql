-- Shell Platform Plugin System Database Schema
-- PostgreSQL database schema for plugin management

-- Create database if not exists
-- CREATE DATABASE shellplatform;

-- Use the database
-- \c shellplatform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CORE TABLES (Managed by Shell, not plugins)
-- ================================================================

-- Plugin registry table
CREATE TABLE IF NOT EXISTS plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'uninstalled' CHECK (status IN ('uninstalled', 'installed', 'active', 'inactive', 'error')),
    required BOOLEAN DEFAULT FALSE,
    manifest JSONB NOT NULL,
    installed_at TIMESTAMP,
    activated_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plugin_version UNIQUE(plugin_id, version)
);

-- Plugin configuration storage
CREATE TABLE IF NOT EXISTS plugin_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB,
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plugin_config UNIQUE(plugin_id, config_key)
);

-- Generic plugin data storage
CREATE TABLE IF NOT EXISTS plugin_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    data_key VARCHAR(255) NOT NULL,
    data_value JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plugin_data UNIQUE(plugin_id, data_key)
);

-- Plugin dependencies
CREATE TABLE IF NOT EXISTS plugin_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    depends_on VARCHAR(255) NOT NULL,
    version_requirement VARCHAR(50),
    optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dependency UNIQUE(plugin_id, depends_on)
);

-- Plugin hooks registry
CREATE TABLE IF NOT EXISTS plugin_hooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    hook_name VARCHAR(255) NOT NULL,
    hook_type VARCHAR(50) CHECK (hook_type IN ('filter', 'action')),
    handler VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hook_name (hook_name),
    INDEX idx_hook_priority (priority)
);

-- Plugin events registry
CREATE TABLE IF NOT EXISTS plugin_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    payload_schema JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_name (event_name)
);

-- Plugin API endpoints registry
CREATE TABLE IF NOT EXISTS plugin_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    path VARCHAR(500) NOT NULL,
    handler VARCHAR(255) NOT NULL,
    permissions JSONB,
    rate_limit JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_endpoint UNIQUE(method, path)
);

-- Plugin migrations tracking
CREATE TABLE IF NOT EXISTS plugin_migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    CONSTRAINT unique_migration UNIQUE(plugin_id, migration_name)
);

-- Plugin activity log
CREATE TABLE IF NOT EXISTS plugin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_plugin_activity (plugin_id, created_at),
    INDEX idx_activity_action (action)
);

-- System settings (used by shell, accessible to plugins)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    setting_type VARCHAR(50),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for authentication service)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(500) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_token (session_token),
    INDEX idx_session_user (user_id),
    INDEX idx_session_expires (expires_at)
);

-- API tokens (for service authentication)
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    permissions JSONB,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_hash (token_hash)
);

-- Cache entries (for database-backed caching)
CREATE TABLE IF NOT EXISTS cache_entries (
    cache_key VARCHAR(500) PRIMARY KEY,
    cache_value JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_expires (expires_at)
);

-- Event bus persistent queue (for async events)
CREATE TABLE IF NOT EXISTS event_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    payload JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_status (status, scheduled_for),
    INDEX idx_event_name (event_name)
);

-- Background jobs queue
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(255) NOT NULL,
    payload JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    result JSONB,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_status (status, priority, scheduled_for),
    INDEX idx_job_type (job_type)
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX idx_plugins_status ON plugins(status);
CREATE INDEX idx_plugins_category ON plugins(category);
CREATE INDEX idx_plugin_configs_updated ON plugin_configs(updated_at);
CREATE INDEX idx_plugin_data_expires ON plugin_data(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_activity_log_created ON plugin_activity_log(created_at);

-- ================================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to relevant tables
CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON plugins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_configs_updated_at BEFORE UPDATE ON plugin_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_data_updated_at BEFORE UPDATE ON plugin_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cache_entries WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM plugin_data WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- Function to log plugin activity
CREATE OR REPLACE FUNCTION log_plugin_activity(
    p_plugin_id VARCHAR(255),
    p_action VARCHAR(100),
    p_details JSONB,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO plugin_activity_log (plugin_id, action, details, user_id)
    VALUES (p_plugin_id, p_action, p_details, p_user_id)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ language 'plpgsql';

-- ================================================================
-- INITIAL DATA
-- ================================================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
    ('shell.version', '"1.0.0"', 'string', 'Shell platform version', true),
    ('shell.name', '"Shell Platform"', 'string', 'Platform name', true),
    ('shell.description', '"Dynamic plugin-based application platform"', 'string', 'Platform description', true),
    ('shell.plugin.autoActivate', 'true', 'boolean', 'Automatically activate plugins after installation', false),
    ('shell.plugin.checkUpdates', 'true', 'boolean', 'Check for plugin updates', false),
    ('shell.plugin.updateInterval', '86400', 'number', 'Update check interval in seconds', false),
    ('shell.theme.default', '"light"', 'string', 'Default theme', true),
    ('shell.locale.default', '"en"', 'string', 'Default locale', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ================================================================
-- PERMISSIONS
-- ================================================================

-- Grant appropriate permissions (adjust based on your database users)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shellplatform_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shellplatform_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO shellplatform_app;