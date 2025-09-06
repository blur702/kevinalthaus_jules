-- Database Optimization Script for Shell Platform
-- PostgreSQL performance tuning and monitoring queries

-- ========================================
-- PERFORMANCE MONITORING QUERIES
-- ========================================

-- Check database size and usage
SELECT 
    pg_database.datname as database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) as size,
    (SELECT count(*) FROM pg_stat_activity WHERE datname = pg_database.datname) as connections
FROM pg_database 
WHERE datistemplate = false
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- Identify unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
AND schemaname = 'public';

-- Check table bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ========================================
-- INDEXES FOR SHELL PLATFORM TABLES
-- ========================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization ON users(organization_id) WHERE organization_id IS NOT NULL;

-- Files table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_id ON files(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_mimetype ON files(mimetype);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_size ON files(size);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_public ON files(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_path ON files USING hash(path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_scan_status ON files(scan_status) WHERE scan_status != 'clean';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_expires_at ON files(expires_at) WHERE expires_at IS NOT NULL;

-- File uploads table (chunked uploads)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_status ON file_uploads(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_expires ON file_uploads(expires_at) WHERE expires_at IS NOT NULL;

-- API keys table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_hashed_key ON api_keys USING hash(hashed_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used DESC) WHERE is_active = true;

-- External API configurations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_apis_user_id ON external_api_configs(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_apis_name ON external_api_configs(name) WHERE is_active = true;

-- Audit logs (time-series data)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at) WHERE created_at > NOW() - INTERVAL '90 days';

-- Sessions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id, expires_at) WHERE expires_at > NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token ON sessions USING hash(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) WHERE expires_at IS NOT NULL;

-- Notifications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);

-- ========================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- ========================================

-- Active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_email ON users(email) WHERE active = true AND deleted_at IS NULL;

-- Recent files only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_recent ON files(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Failed file scans only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_scan_failed ON files(scan_status, created_at) WHERE scan_status IN ('infected', 'error');

-- Unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- ========================================
-- FULL-TEXT SEARCH INDEXES
-- ========================================

-- Full-text search for files
ALTER TABLE files ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_search 
ON files USING gin(search_vector);

-- Update search vector function
CREATE OR REPLACE FUNCTION update_file_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.original_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector update
DROP TRIGGER IF EXISTS trigger_update_file_search_vector ON files;
CREATE TRIGGER trigger_update_file_search_vector
    BEFORE INSERT OR UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_file_search_vector();

-- ========================================
-- QUERY OPTIMIZATION VIEWS
-- ========================================

-- User dashboard view
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id,
    u.email,
    COUNT(f.id) as total_files,
    COALESCE(SUM(f.size), 0) as total_storage_used,
    COUNT(CASE WHEN f.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as files_this_week,
    COUNT(CASE WHEN f.is_public = true THEN 1 END) as public_files,
    MAX(f.created_at) as last_upload
FROM users u
LEFT JOIN files f ON u.id = f.user_id AND f.deleted_at IS NULL
WHERE u.active = true
GROUP BY u.id, u.email;

-- File type statistics
CREATE OR REPLACE VIEW file_type_stats AS
SELECT 
    split_part(mimetype, '/', 1) as category,
    mimetype,
    COUNT(*) as file_count,
    pg_size_pretty(SUM(size)) as total_size,
    AVG(size) as avg_size
FROM files 
WHERE deleted_at IS NULL
GROUP BY split_part(mimetype, '/', 1), mimetype
ORDER BY SUM(size) DESC;

-- System health view
CREATE OR REPLACE VIEW system_health AS
SELECT 
    'users' as metric,
    COUNT(*) as total,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
    COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d
FROM users
WHERE active = true

UNION ALL

SELECT 
    'files' as metric,
    COUNT(*) as total,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
    COUNT(CASE WHEN scan_status = 'clean' THEN 1 END) as active_7d
FROM files
WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'api_keys' as metric,
    COUNT(*) as total,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
    COUNT(CASE WHEN last_used > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d
FROM api_keys
WHERE is_active = true;

-- ========================================
-- PERFORMANCE TUNING FUNCTIONS
-- ========================================

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_stats()
RETURNS void AS $$
BEGIN
    ANALYZE users;
    ANALYZE files;
    ANALYZE api_keys;
    ANALYZE sessions;
    ANALYZE audit_logs;
    ANALYZE notifications;
    ANALYZE external_api_configs;
    RAISE NOTICE 'Table statistics updated';
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild indexes
CREATE OR REPLACE FUNCTION rebuild_indexes()
RETURNS void AS $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    LOOP
        EXECUTE format('REINDEX INDEX CONCURRENTLY %I', idx_record.indexname);
        RAISE NOTICE 'Rebuilt index: %', idx_record.indexname;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old audit log records', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % expired sessions', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired file uploads
CREATE OR REPLACE FUNCTION cleanup_expired_file_uploads()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM file_uploads 
    WHERE expires_at < NOW()
    AND status != 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % expired file uploads', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PERFORMANCE MONITORING SETUP
-- ========================================

-- Enable pg_stat_statements extension for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring table for slow queries
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    query_hash BIGINT,
    query TEXT,
    total_time NUMERIC,
    mean_time NUMERIC,
    calls INTEGER,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_queries(threshold_ms NUMERIC DEFAULT 1000)
RETURNS void AS $$
BEGIN
    INSERT INTO slow_query_log (query_hash, query, total_time, mean_time, calls)
    SELECT 
        queryid,
        query,
        total_time,
        mean_time,
        calls
    FROM pg_stat_statements
    WHERE mean_time > threshold_ms
    AND queryid NOT IN (
        SELECT DISTINCT query_hash 
        FROM slow_query_log 
        WHERE logged_at > NOW() - INTERVAL '1 hour'
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SCHEDULED MAINTENANCE TASKS
-- ========================================

-- Create maintenance schedule (requires pg_cron extension)
-- SELECT cron.schedule('update-stats', '0 2 * * *', 'SELECT update_table_stats();');
-- SELECT cron.schedule('cleanup-logs', '0 3 * * 0', 'SELECT cleanup_old_audit_logs();');
-- SELECT cron.schedule('cleanup-sessions', '0 1 * * *', 'SELECT cleanup_expired_sessions();');
-- SELECT cron.schedule('cleanup-uploads', '*/30 * * * *', 'SELECT cleanup_expired_file_uploads();');
-- SELECT cron.schedule('log-slow-queries', '*/15 * * * *', 'SELECT log_slow_queries();');

-- ========================================
-- CONNECTION POOL OPTIMIZATION
-- ========================================

-- Recommended PostgreSQL configuration parameters
-- Add these to postgresql.conf:

/*
# Memory settings
shared_buffers = 256MB              # 25% of total RAM
effective_cache_size = 1GB          # 75% of total RAM
work_mem = 4MB                      # Per-connection memory
maintenance_work_mem = 64MB         # For maintenance operations

# Checkpoint settings
checkpoint_completion_target = 0.7
wal_buffers = 16MB
default_statistics_target = 100

# Connection settings
max_connections = 100
shared_preload_libraries = 'pg_stat_statements'

# Logging
log_min_duration_statement = 1000   # Log queries taking > 1 second
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Performance
random_page_cost = 1.1              # For SSD storage
effective_io_concurrency = 200      # For SSD storage
*/

-- ========================================
-- BACKUP AND RECOVERY OPTIMIZATION
-- ========================================

-- Function to create backup statistics
CREATE OR REPLACE FUNCTION get_backup_stats()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    size TEXT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        t.n_tup_ins - t.n_tup_del as row_count,
        pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))) as size,
        t.last_vacuum,
        t.last_analyze
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)) DESC;
END;
$$ LANGUAGE plpgsql;

-- Vacuum and analyze all tables
CREATE OR REPLACE FUNCTION maintenance_vacuum_analyze()
RETURNS void AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('VACUUM ANALYZE %I', table_record.tablename);
        RAISE NOTICE 'Vacuumed and analyzed: %', table_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- QUERY EXAMPLES FOR PERFORMANCE TESTING
-- ========================================

-- Example queries that should be optimized

-- 1. User files with metadata
/*
EXPLAIN ANALYZE
SELECT 
    f.id,
    f.original_name,
    f.size,
    f.mimetype,
    f.created_at,
    u.email as owner_email
FROM files f
JOIN users u ON f.user_id = u.id
WHERE f.created_at > NOW() - INTERVAL '30 days'
AND f.is_public = true
ORDER BY f.created_at DESC
LIMIT 50;
*/

-- 2. File search query
/*
EXPLAIN ANALYZE
SELECT 
    id,
    original_name,
    ts_rank(search_vector, plainto_tsquery('english', 'document pdf')) as rank
FROM files
WHERE search_vector @@ plainto_tsquery('english', 'document pdf')
AND deleted_at IS NULL
ORDER BY rank DESC, created_at DESC
LIMIT 20;
*/

-- 3. User dashboard query
/*
EXPLAIN ANALYZE
SELECT * FROM user_dashboard_stats
WHERE id = $1;
*/