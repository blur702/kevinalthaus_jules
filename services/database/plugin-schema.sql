-- Plugin Management Database Schema
-- Tracks plugin installation, enabled/disabled state, and configuration

-- Main plugins table
CREATE TABLE IF NOT EXISTS plugins (
    plugin_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    status VARCHAR(20) DEFAULT 'not_installed' CHECK (status IN ('not_installed', 'installed', 'error')),
    enabled BOOLEAN DEFAULT FALSE,
    installed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Store additional plugin data
);

-- Plugin settings table
CREATE TABLE IF NOT EXISTS plugin_settings (
    id SERIAL PRIMARY KEY,
    plugin_id VARCHAR(100) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plugin_id, setting_key)
);

-- Plugin activity log
CREATE TABLE IF NOT EXISTS plugin_activity (
    id SERIAL PRIMARY KEY,
    plugin_id VARCHAR(100) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    user_id UUID,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plugin dependencies
CREATE TABLE IF NOT EXISTS plugin_dependencies (
    id SERIAL PRIMARY KEY,
    plugin_id VARCHAR(100) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    depends_on VARCHAR(100) REFERENCES plugins(plugin_id),
    version_constraint VARCHAR(50),
    UNIQUE(plugin_id, depends_on)
);

-- Plugin permissions
CREATE TABLE IF NOT EXISTS plugin_permissions (
    id SERIAL PRIMARY KEY,
    plugin_id VARCHAR(100) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(plugin_id, permission)
);

-- Indexes for performance
CREATE INDEX idx_plugins_status ON plugins(status);
CREATE INDEX idx_plugins_enabled ON plugins(enabled);
CREATE INDEX idx_plugin_activity_timestamp ON plugin_activity(timestamp);
CREATE INDEX idx_plugin_settings_key ON plugin_settings(plugin_id, setting_key);

-- Initial data for core plugins
INSERT INTO plugins (plugin_id, name, version, description, author, status, enabled) VALUES
('shell-core', 'Shell Core', '1.0.0', 'Core shell functionality', 'Shell Platform', 'installed', true)
ON CONFLICT (plugin_id) DO NOTHING;