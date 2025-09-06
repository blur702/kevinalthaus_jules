#!/bin/bash
set -e

# Backup and Recovery Script for Shell Platform
# Supports database, file storage, and configuration backups

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_ROOT:-/var/backups/shell-platform}"
LOGS_DIR="$PROJECT_ROOT/logs"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    source "$PROJECT_ROOT/.env.production"
fi

# Default configurations
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${BACKUP_S3_BUCKET:-shell-platform-backups}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"
COMPRESS_BACKUPS="${COMPRESS_BACKUPS:-true}"
PARALLEL_UPLOADS="${PARALLEL_UPLOADS:-4}"

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-shell_platform}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/backup.log"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/backup.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/backup.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/backup.log"
}

# Create backup directory structure
init_backup_dirs() {
    local timestamp="$1"
    local backup_path="$BACKUP_DIR/$timestamp"
    
    mkdir -p "$backup_path"/{database,files,config,kubernetes,logs}
    echo "$backup_path"
}

# Database backup
backup_database() {
    local backup_path="$1"
    local timestamp="$2"
    
    log_info "Starting database backup..."
    
    local db_backup_file="$backup_path/database/database-$timestamp.sql"
    
    # Set PGPASSWORD for non-interactive backup
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create database dump with custom format for better compression and features
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --no-owner \
        --no-acl \
        --file="$db_backup_file.custom"
    
    # Also create plain SQL dump for easier restoration
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --verbose \
        --no-owner \
        --no-acl \
        --file="$db_backup_file"
    
    # Backup database schema only
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --schema-only \
        --file="$backup_path/database/schema-$timestamp.sql"
    
    # Backup specific large tables separately if they exist
    local large_tables=("file_uploads" "user_sessions" "audit_logs")
    for table in "${large_tables[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\\dt $table" 2>/dev/null | grep -q "$table"; then
            pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --format=custom \
                --compress=9 \
                --table="$table" \
                --file="$backup_path/database/$table-$timestamp.dump"
            
            log_info "Backed up large table: $table"
        fi
    done
    
    unset PGPASSWORD
    
    # Verify backup integrity
    if [ -f "$db_backup_file.custom" ]; then
        pg_restore --list "$db_backup_file.custom" > /dev/null
        log_success "Database backup completed and verified: $db_backup_file.custom"
    else
        log_error "Database backup failed"
        return 1
    fi
}

# File storage backup
backup_files() {
    local backup_path="$1"
    local timestamp="$2"
    
    log_info "Starting file storage backup..."
    
    local file_storage_paths=(
        "/var/www/storage/files"
        "/var/www/storage/temp"
        "/var/www/storage/cache"
        "/var/lib/docker/volumes"
    )
    
    for storage_path in "${file_storage_paths[@]}"; do
        if [ -d "$storage_path" ]; then
            local storage_name=$(basename "$storage_path")
            local backup_file="$backup_path/files/$storage_name-$timestamp.tar"
            
            log_info "Backing up $storage_path..."
            
            # Create incremental backup using tar with compression
            tar \
                --create \
                --gzip \
                --file="$backup_file.gz" \
                --listed-incremental="$BACKUP_DIR/incremental/$storage_name.snar" \
                --directory="$(dirname "$storage_path")" \
                "$storage_name" \
                2>/dev/null || true
            
            # Also create a full backup monthly
            local day_of_month=$(date +%d)
            if [ "$day_of_month" = "01" ]; then
                tar \
                    --create \
                    --gzip \
                    --file="$backup_path/files/$storage_name-full-$timestamp.tar.gz" \
                    --directory="$(dirname "$storage_path")" \
                    "$storage_name"
                
                log_info "Created monthly full backup for $storage_name"
            fi
            
            log_success "File backup completed for $storage_path"
        fi
    done
}

# Configuration backup
backup_configuration() {
    local backup_path="$1"
    local timestamp="$2"
    
    log_info "Starting configuration backup..."
    
    local config_paths=(
        "/etc/nginx"
        "/etc/ssl"
        "/etc/letsencrypt"
        "$PROJECT_ROOT/.env*"
        "$PROJECT_ROOT/config"
        "/var/www/monitoring"
    )
    
    for config_path in "${config_paths[@]}"; do
        if [ -e "$config_path" ]; then
            local config_name=$(basename "$config_path")
            
            if [ -d "$config_path" ]; then
                tar \
                    --create \
                    --gzip \
                    --file="$backup_path/config/$config_name-$timestamp.tar.gz" \
                    --directory="$(dirname "$config_path")" \
                    "$config_name"
            else
                cp "$config_path" "$backup_path/config/"
            fi
            
            log_info "Backed up configuration: $config_path"
        fi
    done
    
    # Backup Kubernetes configurations
    if command -v kubectl &> /dev/null; then
        kubectl get all --all-namespaces -o yaml > "$backup_path/kubernetes/all-resources-$timestamp.yaml"
        kubectl get configmaps --all-namespaces -o yaml > "$backup_path/kubernetes/configmaps-$timestamp.yaml"
        kubectl get secrets --all-namespaces -o yaml > "$backup_path/kubernetes/secrets-$timestamp.yaml"
        kubectl get pv,pvc --all-namespaces -o yaml > "$backup_path/kubernetes/volumes-$timestamp.yaml"
        
        log_info "Kubernetes configuration backup completed"
    fi
    
    log_success "Configuration backup completed"
}

# Application logs backup
backup_logs() {
    local backup_path="$1"
    local timestamp="$2"
    
    log_info "Starting logs backup..."
    
    local log_paths=(
        "/var/log/nginx"
        "/var/log/shell-platform"
        "$PROJECT_ROOT/logs"
        "/var/lib/docker/containers"
    )
    
    for log_path in "${log_paths[@]}"; do
        if [ -d "$log_path" ]; then
            local log_name=$(basename "$log_path")
            
            # Only backup logs from last 7 days to save space
            find "$log_path" -type f -mtime -7 -name "*.log*" | \
            tar \
                --create \
                --gzip \
                --file="$backup_path/logs/$log_name-$timestamp.tar.gz" \
                --files-from=-
            
            log_info "Backed up recent logs from $log_path"
        fi
    done
    
    log_success "Logs backup completed"
}

# Encrypt backup
encrypt_backup() {
    local backup_path="$1"
    local timestamp="$2"
    
    if [ "$ENCRYPT_BACKUPS" = "true" ] && [ -n "$ENCRYPTION_KEY" ]; then
        log_info "Encrypting backup..."
        
        # Create encrypted archive
        tar -czf - -C "$BACKUP_DIR" "$timestamp" | \
        openssl enc -aes-256-cbc -salt -k "$ENCRYPTION_KEY" > "$backup_path.tar.gz.enc"
        
        # Remove unencrypted backup
        rm -rf "$backup_path"
        
        log_success "Backup encrypted: $backup_path.tar.gz.enc"
        echo "$backup_path.tar.gz.enc"
    else
        # Just compress the backup
        tar -czf "$backup_path.tar.gz" -C "$BACKUP_DIR" "$timestamp"
        rm -rf "$backup_path"
        
        log_success "Backup compressed: $backup_path.tar.gz"
        echo "$backup_path.tar.gz"
    fi
}

# Upload to S3
upload_to_s3() {
    local backup_file="$1"
    local timestamp="$2"
    
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log_info "Uploading backup to S3..."
        
        local s3_key="backups/$(date +%Y/%m/%d)/$(basename "$backup_file")"
        
        # Upload with multipart for large files
        aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" \
            --storage-class STANDARD_IA \
            --metadata "timestamp=$timestamp,type=backup" \
            --no-progress
        
        # Set lifecycle policy for automatic cleanup
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "$s3_key" \
            --tagging "TagSet=[{Key=AutoDelete,Value=true},{Key=RetentionDays,Value=$RETENTION_DAYS}]"
        
        log_success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -name "*.tar.gz*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "backups/" \
            --query "Contents[?LastModified<'$cutoff_date'].Key" \
            --output text | \
        while read -r key; do
            if [ -n "$key" ] && [ "$key" != "None" ]; then
                aws s3 rm "s3://$S3_BUCKET/$key"
                log_info "Deleted old S3 backup: $key"
            fi
        done
    fi
    
    log_success "Backup cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity..."
    
    if [[ "$backup_file" == *.enc ]]; then
        # Test encrypted backup
        openssl enc -aes-256-cbc -d -salt -k "$ENCRYPTION_KEY" -in "$backup_file" | tar -tzf - > /dev/null
    else
        # Test compressed backup
        tar -tzf "$backup_file" > /dev/null
    fi
    
    log_success "Backup integrity verified"
}

# Send backup notification
send_notification() {
    local status="$1"
    local backup_file="$2"
    local size="$3"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local message="Backup completed: $(basename "$backup_file") (${size})"
        if [ "$status" != "success" ]; then
            message="Backup failed - check logs"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"💾 Shell Platform Backup\", \"attachments\":[{\"color\":\"good\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# Restore function
restore_backup() {
    local backup_file="$1"
    local restore_type="${2:-full}"
    
    log_info "Starting restore from $backup_file (type: $restore_type)..."
    
    # Create temporary restore directory
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    # Extract backup
    if [[ "$backup_file" == *.enc ]]; then
        openssl enc -aes-256-cbc -d -salt -k "$ENCRYPTION_KEY" -in "$backup_file" | tar -xzf - -C "$temp_dir"
    else
        tar -xzf "$backup_file" -C "$temp_dir"
    fi
    
    local restore_dir=$(find "$temp_dir" -type d -name "*-*-*-*" | head -1)
    
    case "$restore_type" in
        database)
            restore_database "$restore_dir"
            ;;
        files)
            restore_files "$restore_dir"
            ;;
        config)
            restore_configuration "$restore_dir"
            ;;
        full)
            restore_database "$restore_dir"
            restore_files "$restore_dir"
            restore_configuration "$restore_dir"
            ;;
        *)
            log_error "Unknown restore type: $restore_type"
            exit 1
            ;;
    esac
    
    log_success "Restore completed successfully"
}

# Database restore
restore_database() {
    local restore_dir="$1"
    
    log_info "Restoring database..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Find the most recent database backup
    local db_backup=$(find "$restore_dir/database" -name "*.custom" | sort | tail -1)
    
    if [ -n "$db_backup" ]; then
        # Drop existing database (be careful!)
        read -p "This will drop the existing database. Continue? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            dropdb --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" "$DB_NAME" --if-exists
            createdb --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" "$DB_NAME"
            
            pg_restore \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --verbose \
                --clean \
                --if-exists \
                "$db_backup"
            
            log_success "Database restored from $db_backup"
        fi
    fi
    
    unset PGPASSWORD
}

# Files restore
restore_files() {
    local restore_dir="$1"
    
    log_info "Restoring files..."
    
    find "$restore_dir/files" -name "*.tar.gz" | while read -r file_backup; do
        local storage_name=$(basename "$file_backup" | cut -d'-' -f1)
        local target_dir="/var/www/storage/$storage_name"
        
        read -p "Restore files to $target_dir? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            mkdir -p "$(dirname "$target_dir")"
            tar -xzf "$file_backup" -C "$(dirname "$target_dir")"
            log_success "Files restored to $target_dir"
        fi
    done
}

# Configuration restore
restore_configuration() {
    local restore_dir="$1"
    
    log_info "Restoring configuration..."
    
    find "$restore_dir/config" -name "*.tar.gz" | while read -r config_backup; do
        local config_name=$(basename "$config_backup" | cut -d'-' -f1)
        
        read -p "Restore $config_name configuration? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            case "$config_name" in
                nginx)
                    tar -xzf "$config_backup" -C /etc/
                    systemctl reload nginx || true
                    ;;
                ssl)
                    tar -xzf "$config_backup" -C /etc/
                    ;;
                letsencrypt)
                    tar -xzf "$config_backup" -C /etc/
                    ;;
                *)
                    log_warn "Unknown configuration type: $config_name"
                    ;;
            esac
            
            log_success "Configuration restored: $config_name"
        fi
    done
}

# List available backups
list_backups() {
    log_info "Available local backups:"
    find "$BACKUP_DIR" -name "*.tar.gz*" -type f -printf "%T@ %TF %TT %p\n" | sort -n | cut -d' ' -f2- | tail -20
    
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log_info "Available S3 backups:"
        aws s3 ls "s3://$S3_BUCKET/backups/" --recursive --human-readable | tail -20
    fi
}

# Main backup function
backup() {
    local backup_type="${1:-full}"
    local timestamp=$(date "+%Y-%m-%d-%H-%M-%S")
    
    log_info "Starting $backup_type backup at $timestamp"
    
    # Initialize backup directories
    local backup_path=$(init_backup_dirs "$timestamp")
    
    # Perform backup based on type
    case "$backup_type" in
        database)
            backup_database "$backup_path" "$timestamp"
            ;;
        files)
            backup_files "$backup_path" "$timestamp"
            ;;
        config)
            backup_configuration "$backup_path" "$timestamp"
            ;;
        logs)
            backup_logs "$backup_path" "$timestamp"
            ;;
        full|*)
            backup_database "$backup_path" "$timestamp"
            backup_files "$backup_path" "$timestamp"
            backup_configuration "$backup_path" "$timestamp"
            backup_logs "$backup_path" "$timestamp"
            ;;
    esac
    
    # Encrypt and compress backup
    local final_backup=$(encrypt_backup "$backup_path" "$timestamp")
    
    # Verify backup
    verify_backup "$final_backup"
    
    # Get backup size
    local backup_size=$(du -h "$final_backup" | cut -f1)
    
    # Upload to S3
    upload_to_s3 "$final_backup" "$timestamp"
    
    # Send notification
    send_notification "success" "$final_backup" "$backup_size"
    
    # Cleanup old backups
    cleanup_old_backups
    
    log_success "Backup completed: $final_backup ($backup_size)"
}

# Main script entry point
main() {
    mkdir -p "$LOGS_DIR" "$BACKUP_DIR/incremental"
    
    case "${1:-backup}" in
        backup)
            backup "${2:-full}"
            ;;
        restore)
            if [ -z "$2" ]; then
                log_error "Backup file required for restore"
                exit 1
            fi
            restore_backup "$2" "${3:-full}"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore|list|cleanup} [options]"
            echo ""
            echo "  backup [type]     - Create backup (types: full, database, files, config, logs)"
            echo "  restore <file>    - Restore from backup file"
            echo "  list              - List available backups"
            echo "  cleanup           - Cleanup old backups"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi